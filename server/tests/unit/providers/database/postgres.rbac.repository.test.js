'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
const mockUuidV4 = jest.fn(() => 'gen-uuid');

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

jest.mock('uuid', () => ({ v4: mockUuidV4 }));

const repo = require('@/providers/database/postgres.rbac.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('createRole', () => {
    it('inserts the role with explicit values and returns the id', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'r1' }] });

        await expect(
            repo.createRole({ id: 'r1', name: 'admin', description: 'Adm', isSystem: true })
        ).resolves.toBe('r1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO roles');
        expect(sql).toContain('ON CONFLICT (name) DO UPDATE');
        expect(sql).toContain('RETURNING id');
        expect(params).toEqual(['r1', 'admin', 'Adm', true]);
    });

    it('generates an id and applies defaults for missing fields', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'gen' }] });

        await expect(repo.createRole({ name: 'user' })).resolves.toBe('gen');

        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toMatch(UUID_RE);
        expect(params[2]).toBe('');
        expect(params[3]).toBe(false);
    });

    it('propagates errors when the insert returns no rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.createRole({ name: 'x' })).rejects.toThrow();
    });
});

describe('role lookups', () => {
    it('findRoleByName returns the row when found', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'r1', name: 'admin' }] });

        await expect(repo.findRoleByName('admin')).resolves.toEqual({ id: 'r1', name: 'admin' });
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM roles WHERE name = $1', ['admin']);
    });

    it('findRoleByName returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findRoleByName('ghost')).resolves.toBeNull();
    });

    it('findAllRoles returns all rows ordered by name', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'r1' }, { id: 'r2' }] });

        await expect(repo.findAllRoles()).resolves.toEqual([{ id: 'r1' }, { id: 'r2' }]);
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM roles ORDER BY name');
    });
});

describe('deleteRole', () => {
    it('deletes only non-system roles by id', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.deleteRole('r1');

        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM roles WHERE id = $1 AND is_system = false',
            ['r1']
        );
    });
});

describe('createPermission', () => {
    it('inserts the permission with explicit id and returns it', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'p1' }] });

        await expect(
            repo.createPermission({ id: 'p1', name: 'event:create', description: 'D', resource: 'event', action: 'create' })
        ).resolves.toBe('p1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO permissions');
        expect(sql).toContain('ON CONFLICT (name) DO UPDATE');
        expect(params).toEqual(['p1', 'event:create', 'D', 'event', 'create']);
    });

    it('generates an id and defaults the description', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'gen' }] });

        await expect(
            repo.createPermission({ name: 'event:read', resource: 'event', action: 'read' })
        ).resolves.toBe('gen');

        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toMatch(UUID_RE);
        expect(params[2]).toBe('');
    });
});

describe('permission lookups', () => {
    it('findPermissionByName returns the row when found', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'p1', name: 'event:read' }] });

        await expect(repo.findPermissionByName('event:read')).resolves.toEqual({ id: 'p1', name: 'event:read' });
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM permissions WHERE name = $1', ['event:read']);
    });

    it('findPermissionByName returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findPermissionByName('ghost')).resolves.toBeNull();
    });

    it('findAllPermissions returns rows ordered by resource and action', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'p1' }] });

        await expect(repo.findAllPermissions()).resolves.toEqual([{ id: 'p1' }]);
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM permissions ORDER BY resource, action'
        );
    });
});

describe('role-permission assignments', () => {
    it('assignPermissionToRole upserts without conflict', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.assignPermissionToRole('r1', 'p1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO role_permissions (role_id, permission_id)'),
            ['r1', 'p1']
        );
        expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT DO NOTHING');
    });

    it('removePermissionFromRole deletes the link', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.removePermissionFromRole('r1', 'p1');

        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
            ['r1', 'p1']
        );
    });

    it('getPermissionsForRole joins permissions and orders by resource and action', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'p1' }] });

        await expect(repo.getPermissionsForRole('r1')).resolves.toEqual([{ id: 'p1' }]);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('JOIN role_permissions rp ON rp.permission_id = p.id');
        expect(sql).toContain('WHERE rp.role_id = $1');
        expect(sql).toContain('ORDER BY p.resource, p.action');
        expect(params).toEqual(['r1']);
    });

    it('getRolesForPermission joins roles and orders by name', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'r1' }] });

        await expect(repo.getRolesForPermission('p1')).resolves.toEqual([{ id: 'r1' }]);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('JOIN role_permissions rp ON rp.role_id = r.id');
        expect(sql).toContain('WHERE rp.permission_id = $1');
        expect(sql).toContain('ORDER BY r.name');
        expect(params).toEqual(['p1']);
    });
});

describe('resolveUserPermissions', () => {
    it('queries permissions across roles assigned in auth_users.roles', async () => {
        mockQuery.mockResolvedValue({ rows: [{ name: 'event:read' }] });

        await expect(repo.resolveUserPermissions('u1')).resolves.toEqual([{ name: 'event:read' }]);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('JOIN auth_users u ON u.id = $1');
        expect(sql).toContain('WHERE r.name = ANY(u.roles)');
        expect(sql).toContain('ORDER BY p.resource, p.action');
        expect(params).toEqual(['u1']);
    });

    it('resolveUserPermissionNames returns the flattened names', async () => {
        mockQuery.mockResolvedValue({ rows: [{ name: 'event:create' }, { name: 'event:read' }] });

        await expect(repo.resolveUserPermissionNames('u1')).resolves.toEqual(['event:create', 'event:read']);
    });
});

describe('createOrganization', () => {
    it('inserts with explicit values and returns the id', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'o1' }] });

        await expect(
            repo.createOrganization({ id: 'o1', name: 'Acme', slug: 'acme', description: 'D', logoUrl: 'L' })
        ).resolves.toBe('o1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO organizations');
        expect(sql).toContain('ON CONFLICT (slug) DO UPDATE');
        expect(params).toEqual(['o1', 'Acme', 'acme', 'D', 'L']);
    });

    it('generates an id and defaults description and logo url', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'gen' }] });

        await expect(repo.createOrganization({ name: 'Acme', slug: 'acme' })).resolves.toBe('gen');

        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toMatch(UUID_RE);
        expect(params[3]).toBe('');
        expect(params[4]).toBe('');
    });
});

describe('organization lookups', () => {
    it('findOrganizationById returns the row when found', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'o1' }] });

        await expect(repo.findOrganizationById('o1')).resolves.toEqual({ id: 'o1' });
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM organizations WHERE id = $1', ['o1']);
    });

    it('findOrganizationById returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.findOrganizationById('missing')).resolves.toBeNull();
    });

    it('findOrganizationBySlug returns the row when found', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'o1', slug: 'acme' }] });

        await expect(repo.findOrganizationBySlug('acme')).resolves.toEqual({ id: 'o1', slug: 'acme' });
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM organizations WHERE slug = $1', ['acme']);
    });

    it('findAllOrganizations returns rows ordered by name', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'o1' }] });

        await expect(repo.findAllOrganizations()).resolves.toEqual([{ id: 'o1' }]);
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM organizations ORDER BY name');
    });
});

describe('organization memberships', () => {
    it('addOrganizationMember defaults role and permissions override', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.addOrganizationMember({ id: 'm1', organizationId: 'o1', userId: 'u1' })).resolves.toBe('m1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO organization_memberships');
        expect(sql).toContain('ON CONFLICT (organization_id, user_id) DO UPDATE');
        expect(params).toEqual(['m1', 'o1', 'u1', 'member', null]);
    });

    it('addOrganizationMember passes through explicit role and override', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.addOrganizationMember({
            id: 'm1', organizationId: 'o1', userId: 'u1', role: 'admin', permissionsOverride: ['event:read'],
        });

        expect(mockQuery.mock.calls[0][1]).toEqual(['m1', 'o1', 'u1', 'admin', ['event:read']]);
    });

    it('removeOrganizationMember deletes by organization and user', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.removeOrganizationMember('o1', 'u1');

        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
            ['o1', 'u1']
        );
    });

    it('getOrganizationMembers joins auth_users and orders by joined_at', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'm1' }] });

        await expect(repo.getOrganizationMembers('o1')).resolves.toEqual([{ id: 'm1' }]);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('JOIN auth_users u ON u.id = om.user_id');
        expect(sql).toContain('WHERE om.organization_id = $1');
        expect(sql).toContain('ORDER BY om.joined_at');
        expect(params).toEqual(['o1']);
    });

    it('getUserOrganizationMemberships joins organizations and orders by name', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'm1' }] });

        await expect(repo.getUserOrganizationMemberships('u1')).resolves.toEqual([{ id: 'm1' }]);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('JOIN organizations o ON o.id = om.organization_id');
        expect(sql).toContain('WHERE om.user_id = $1');
        expect(sql).toContain('ORDER BY o.name');
        expect(params).toEqual(['u1']);
    });

    it('getOrganizationMember returns the row when found', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'm1' }] });

        await expect(repo.getOrganizationMember('o1', 'u1')).resolves.toEqual({ id: 'm1' });

        expect(mockQuery.mock.calls[0][0]).toContain('WHERE om.organization_id = $1 AND om.user_id = $2');
        expect(mockQuery.mock.calls[0][1]).toEqual(['o1', 'u1']);
    });

    it('getOrganizationMember returns null when not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getOrganizationMember('o1', 'u1')).resolves.toBeNull();
    });
});

describe('createAuditLog', () => {
    it('inserts mapped columns with serialized metadata and timestamps', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
            repo.createAuditLog({
                id: 'log1', actorId: 'u1', action: 'update', resourceType: 'event',
                resourceId: 'e1', metadata: { note: 'n' }, ipAddress: '1.2.3.4',
            })
        ).resolves.toBe('log1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO audit_logs');
        expect(params).toEqual([
            'log1', 'u1', 'update', 'event', 'e1', JSON.stringify({ note: 'n' }), '1.2.3.4', expect.any(Date),
        ]);
    });

    it('generates a prefixed id and applies defaults', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const id = await repo.createAuditLog({ actorId: 'u1', action: 'read', resourceType: 'event', resourceId: 'e1' });

        expect(id).toMatch(/^aud_/);
        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toBe(id);
        expect(params[5]).toBe('{}');
        expect(params[6]).toBe('');
        expect(params[7]).toEqual(expect.any(Date));
    });
});

describe('audit log queries', () => {
    it('findAuditLogsByActor applies default limit and offset', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'log1' }] });

        await expect(repo.findAuditLogsByActor('u1')).resolves.toEqual([{ id: 'log1' }]);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3'
        );
        expect(params).toEqual(['u1', 50, 0]);
    });

    it('findAuditLogsByActor honors explicit limit and offset', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.findAuditLogsByActor('u1', 10, 20);

        expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 10, 20]);
    });

    it('findAuditLogsByResource filters by resource type and id with default pagination', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.findAuditLogsByResource('event', 'e1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('WHERE resource_type = $1 AND resource_id = $2');
        expect(params).toEqual(['event', 'e1', 50, 0]);
    });
});

describe('seedDefaults', () => {
    it('seeds roles, permissions and role-permission assignments inside a transaction', async () => {
        const client = {
            query: jest.fn((sql, params) => {
                if (sql.includes('SELECT id FROM roles WHERE name = $1')) {
                    return Promise.resolve({ rows: [{ id: 'role:' + params[0] }] });
                }
                if (sql.includes('SELECT id FROM permissions WHERE name = $1')) {
                    return Promise.resolve({ rows: [{ id: 'perm:' + params[0] }] });
                }
                return Promise.resolve({ rows: [] });
            }),
        };
        mockTransaction.mockImplementation(async (cb) => cb(client));

        await repo.seedDefaults();

        expect(mockTransaction).toHaveBeenCalledTimes(1);

        const roleInserts = client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO roles'));
        expect(roleInserts).toHaveLength(5);
        expect(roleInserts.every(([sql, params]) =>
            sql.includes('VALUES ($1, $2, $3, true)') && params.length === 3
        )).toBe(true);

        const permissionInserts = client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO permissions'));
        expect(permissionInserts).toHaveLength(16);

        const assignmentInserts = client.query.mock.calls.filter(([sql]) =>
            sql.includes('INSERT INTO role_permissions')
        );
        expect(assignmentInserts).toHaveLength(43);
        expect(assignmentInserts).toContainEqual([
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            ['role:admin', 'perm:event:create'],
        ]);
        expect(assignmentInserts).toContainEqual([
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            ['role:user', 'perm:event:read'],
        ]);
    });

    it('skips assignments when a role lookup returns no rows', async () => {
        const client = {
            query: jest.fn(() => Promise.resolve({ rows: [] })),
        };
        mockTransaction.mockImplementation(async (cb) => cb(client));

        await repo.seedDefaults();

        const assignmentInserts = client.query.mock.calls.filter(([sql]) =>
            sql.includes('INSERT INTO role_permissions')
        );
        expect(assignmentInserts).toHaveLength(0);
    });

    it('propagates errors thrown inside the transaction', async () => {
        mockTransaction.mockRejectedValue(new Error('tx failed'));

        await expect(repo.seedDefaults()).rejects.toThrow('tx failed');
    });
});
