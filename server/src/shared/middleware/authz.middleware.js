const rbacRepository = require('@/providers/database/rbac.repository');
const eventRepository = require('@/providers/database/event.repository');
const orderRepository = require('@/providers/database/order.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const venueRepository = require('@/providers/database/venue.repository');
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError } = require('@/shared/errors');
const logger = require('@/shared/logger');

const REPOSITORY_LOADERS = Object.freeze({
  event: async (id) => eventRepository.getEventById(id),
  order: async (id) => orderRepository.getOrderById(id),
  ticket: async (id) => ticketRepository.getTicketById(id),
  venue: async (id) => venueRepository.getVenueById(id),
});

function userHasRole(req, role) {
  if (!req.user) return false;
  const userRoles = req.user.roles || (Array.isArray(req.user.role) ? req.user.role : [req.user.role]).filter(Boolean);
  return userRoles.includes(role);
}

function sendLegacyError(res, appError, legacyMessage) {
  return res.status(appError.statusCode).send({ error: legacyMessage || appError.message });
}

function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat(Infinity);
  return function(req, res, next) {
    if (!req.user) {
      logger.warn('Unauthorized access attempt: No user context', {
        path: req.originalUrl || req.url,
        method: req.method,
      });
      return sendLegacyError(res, new UnauthorizedError(), 'Unauthorized: No authenticated user.');
    }
    const hasRole = roles.some(function(role) {
      return userHasRole(req, role);
    });
    if (!hasRole) {
      logger.warn('Forbidden access attempt: Insufficient roles', {
        userId: req.user.uid || req.user.id || req.user.user_id,
        userRoles: req.user.roles || req.user.role,
        requiredRoles: roles,
        path: req.originalUrl || req.url,
        method: req.method,
      });
      return sendLegacyError(res, new ForbiddenError(), 'Forbidden: Requires one of roles: ' + roles.join(', '));
    }
    next();
  };
}

function requireOwnership(resourceType, idParam = 'id', options = {}) {
  const normalizedType = String(resourceType).toLowerCase();
  const loader = REPOSITORY_LOADERS[normalizedType];
  if (!loader) {
    throw new Error(`[requireOwnership] Unsupported resource type '${resourceType}'. Allowed: Event, Order, Ticket, Venue.`);
  }

  return async function(req, res, next) {
    if (!req.user) {
      logger.warn(`Unauthorized ownership check attempt for ${resourceType}: No user context`);
      return sendLegacyError(res, new UnauthorizedError(), 'Unauthorized: No authenticated user.');
    }

    const userId = req.user.uid || req.user.id || req.user.user_id;

    // Explicit and minimal Admin bypass policy
    const allowAdminBypass = options.allowAdminBypass !== false;
    if (allowAdminBypass && userHasRole(req, 'admin')) {
      return next();
    }

    const resourceId = req.params[idParam] || req.body[idParam] || req.query[idParam];
    if (!resourceId) {
      logger.warn(`Bad Request: Missing parameter '${idParam}' for ${resourceType} ownership check`);
      return sendLegacyError(res, new BadRequestError(), `Bad Request: Missing resource identifier parameter '${idParam}'.`);
    }

    try {
      const resource = await loader(resourceId);
      if (!resource) {
        return sendLegacyError(res, new NotFoundError(), `${resourceType} not found.`);
      }

      // Direct owner check
      const ownerId = resource.organizerId || resource.organizer_id || resource.userId || resource.user_id;
      let hasOwnership = ownerId && (String(ownerId) === String(userId));

      // For Ticket or Order: if user is organizer of the event associated with ticket/order
      if (!hasOwnership && resource.eventId) {
        try {
          const event = await eventRepository.getEventById(resource.eventId);
          if (event && (String(event.organizerId || event.organizer_id) === String(userId))) {
            hasOwnership = true;
          }
        } catch (_) {}
      }

      if (!hasOwnership) {
        logger.warn(`Forbidden: User ${userId} does not own ${resourceType} ${resourceId}`, {
          userId,
          resourceType,
          resourceId,
          ownerId,
        });
        return sendLegacyError(res, new ForbiddenError(), `Forbidden: You do not have ownership permission for this ${resourceType.toLowerCase()}.`);
      }

      req.targetResource = resource;
      next();
    } catch (err) {
      logger.error(`[requireOwnership] Error checking ${resourceType} ${resourceId}: ${err.message}`);
      return sendLegacyError(res, new InternalServerError(), `Internal Error verifying ownership for ${resourceType}.`);
    }
  };
}

function requirePermission(...requiredPermissions) {
  return async function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No authenticated user.' });
    }
    try {
      const userId = req.user.uid || req.user.id || req.user.user_id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Cannot resolve user identity.' });
      }
      const userPerms = await rbacRepository.resolveUserPermissionNames(userId);
      const hasPermission = requiredPermissions.some(function(perm) {
        return userPerms.includes(perm);
      });
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden: Requires one of permissions: ' + requiredPermissions.join(', '),
        });
      }
      next();
    } catch (err) {
      logger.error('requirePermission error', { error: err.message });
      return sendLegacyError(res, new InternalServerError(), 'Internal Server Error checking permissions.');
    }
  };
}

function requireOrganizationRole(orgIdParam, ...allowedRoles) {
  return async function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No authenticated user.' });
    }
    const orgId = req.params[orgIdParam] || req.body[orgIdParam] || req.query[orgIdParam];
    if (!orgId) {
      return res.status(400).json({ error: 'Bad Request: Organization identifier required.' });
    }
    try {
      const userId = req.user.uid || req.user.id || req.user.user_id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Cannot resolve user identity.' });
      }
      const membership = await rbacRepository.getOrganizationMember(orgId, userId);
      if (!membership) {
        return res.status(403).json({ error: 'Forbidden: Not a member of this organization.' });
      }
      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          error: 'Forbidden: Requires one of organization roles: ' + allowedRoles.join(', '),
        });
      }
      req.organizationMembership = membership;
      next();
    } catch (err) {
      logger.error('requireOrganizationRole error', { error: err.message });
      return sendLegacyError(res, new InternalServerError(), 'Internal Server Error checking organization membership.');
    }
  };
}

function auditLog(action, resourceType, idParamName = 'id') {
  return async function(req, res, next) {
    const originalSend = res.json.bind(res);
    res.json = function(body) {
      const userId = req.user ? (req.user.uid || req.user.id || req.user.user_id) : 'system';
      let resourceId = req.params[idParamName] || 
                         req.body[idParamName] || 
                         req.query[idParamName] || 
                         (body && body[idParamName]) || 
                         (req.user ? (req.user.uid || req.user.id || req.user.user_id) : '') ||
                         '';
                         
      // Fallback nested extraction for webhooks (e.g. ZaloPay callbacks)
      if (!resourceId && req.body && req.body.data && idParamName === 'ticketId') {
        try {
          const dataObj = JSON.parse(req.body.data);
          if (dataObj.embed_data) {
            const embedData = typeof dataObj.embed_data === 'string' ? JSON.parse(dataObj.embed_data) : dataObj.embed_data;
            resourceId = embedData.ticket_id || embedData.ticketId || '';
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (userId && resourceId) {
        const metadata = {
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
        };
        rbacRepository.createAuditLog({
          actorId: userId,
          action: action,
          resourceType: resourceType,
          resourceId: resourceId,
          metadata: metadata,
          ipAddress: req.ip || req.connection.remoteAddress || '',
        }).catch(function(err) {
          logger.error('auditLog error', { error: err.message });
        });
      }
      return originalSend(body);
    };
    next();
  };
}

module.exports = {
  userHasRole,
  sendLegacyError,
  requireRole,
  requireOwnership,
  requirePermission,
  requireOrganizationRole,
  auditLog,
};
