const rbacRepository = require('@/providers/database/rbac.repository');

function userHasRole(req, role) {
  if (!req.user) return false;
  const userRoles = req.user.roles || [];
  return userRoles.includes(role);
}

function requireRole(...allowedRoles) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No authenticated user.' });
    }
    const hasRole = allowedRoles.some(function(role) {
      return userHasRole(req, role);
    });
    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden: Requires one of roles: ' + allowedRoles.join(', '),
      });
    }
    next();
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
      console.error('requirePermission error:', err);
      return res.status(500).json({ error: 'Internal Server Error checking permissions.' });
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
      console.error('requireOrganizationRole error:', err);
      return res.status(500).json({ error: 'Internal Server Error checking organization membership.' });
    }
  };
}

function auditLog(action, resourceType) {
  return async function(req, res, next) {
    const originalSend = res.json.bind(res);
    res.json = function(body) {
      const userId = req.user ? (req.user.uid || req.user.id || req.user.user_id) : null;
      const resourceId = req.params.id || req.body.id || (body && body.id) || '';
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
          console.error('auditLog error:', err);
        });
      }
      return originalSend(body);
    };
    next();
  };
}

module.exports = {
  userHasRole,
  requireRole,
  requirePermission,
  requireOrganizationRole,
  auditLog,
};
