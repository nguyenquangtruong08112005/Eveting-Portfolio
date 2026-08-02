'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockOrgTeamService = {
  listUserTeams: jest.fn(),
  listTeamMembers: jest.fn(),
  inviteMember: jest.fn(),
  acceptInvitation: jest.fn(),
  updateMember: jest.fn(),
  removeMember: jest.fn(),
};
jest.mock('@/modules/memberships/application/organizer-team.service', () => mockOrgTeamService);

const {
  getMyTeams,
  getTeamMembers,
  inviteMember,
  acceptInvitation,
  updateMember,
  removeMember,
} = require('@/modules/memberships/api/team.controller');

const uid = 'user_001';
const teamId = 'team_001';
const memberId = 'member_001';
const token = 'invitation-token-12345';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getMyTeams', () => {
  it('returns teams with 200', async () => {
    const teams = [{ id: teamId, name: 'My Team' }];
    mockOrgTeamService.listUserTeams.mockResolvedValue(teams);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getMyTeams(req, res, next);
    expect(mockOrgTeamService.listUserTeams).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ teams });
  });

  it('propagates error via next', async () => {
    mockOrgTeamService.listUserTeams.mockRejectedValue(new Error('fail'));
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getMyTeams(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'fail' }));
  });
});

describe('getTeamMembers', () => {
  it('returns team members with 200', async () => {
    const members = [{ id: memberId, role: 'MANAGER' }];
    mockOrgTeamService.listTeamMembers.mockResolvedValue(members);
    const req = mockReq({ query: { teamId } });
    const res = mockRes();
    const next = jest.fn();
    await getTeamMembers(req, res, next);
    expect(mockOrgTeamService.listTeamMembers).toHaveBeenCalledWith(uid, teamId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ members });
  });

  it('passes undefined teamId when not provided', async () => {
    mockOrgTeamService.listTeamMembers.mockResolvedValue([]);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getTeamMembers(req, res, next);
    expect(mockOrgTeamService.listTeamMembers).toHaveBeenCalledWith(uid, undefined);
  });
});

describe('inviteMember', () => {
  it('returns 201 with invitation', async () => {
    const invitation = { id: 'inv_1', email: 'a@b.com', role: 'MANAGER' };
    mockOrgTeamService.inviteMember.mockResolvedValue(invitation);
    const body = { email: 'a@b.com', role: 'MANAGER' };
    const req = mockReq({ body });
    const res = mockRes();
    const next = jest.fn();
    await inviteMember(req, res, next);
    expect(mockOrgTeamService.inviteMember).toHaveBeenCalledWith(uid, body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ invitation });
  });
});

describe('acceptInvitation', () => {
  it('returns 200 with member', async () => {
    const member = { id: memberId, teamId, status: 'ACTIVE' };
    mockOrgTeamService.acceptInvitation.mockResolvedValue(member);
    const req = mockReq({ params: { token } });
    const res = mockRes();
    const next = jest.fn();
    await acceptInvitation(req, res, next);
    expect(mockOrgTeamService.acceptInvitation).toHaveBeenCalledWith(uid, token);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ member });
  });
});

describe('updateMember', () => {
  it('returns 200 with updated member', async () => {
    const member = { id: memberId, role: 'ADMIN' };
    mockOrgTeamService.updateMember.mockResolvedValue(member);
    const body = { role: 'ADMIN' };
    const req = mockReq({ params: { memberId }, body });
    const res = mockRes();
    const next = jest.fn();
    await updateMember(req, res, next);
    expect(mockOrgTeamService.updateMember).toHaveBeenCalledWith(uid, memberId, body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ member });
  });
});

describe('removeMember', () => {
  it('returns 200 with result', async () => {
    const result = { success: true };
    mockOrgTeamService.removeMember.mockResolvedValue(result);
    const req = mockReq({ params: { memberId } });
    const res = mockRes();
    const next = jest.fn();
    await removeMember(req, res, next);
    expect(mockOrgTeamService.removeMember).toHaveBeenCalledWith(uid, memberId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
