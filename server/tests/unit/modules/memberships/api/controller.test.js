'use strict';

const mockMembershipService = { getMyMembership: jest.fn() };
jest.mock('@/modules/memberships/application/service', () => mockMembershipService);

const { getMyMembership } = require('@/modules/memberships/api/controller');

const uid = 'user_001';

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

describe('getMyMembership', () => {
  it('returns membership with 200', async () => {
    const result = { tier: 'gold', points: 500, ledger: [] };
    mockMembershipService.getMyMembership.mockResolvedValue(result);
    const req = mockReq();
    const res = mockRes();
    await getMyMembership(req, res);
    expect(mockMembershipService.getMyMembership).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('returns 500 when service throws', async () => {
    mockMembershipService.getMyMembership.mockRejectedValue(new Error('DB error'));
    const req = mockReq();
    const res = mockRes();
    await getMyMembership(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
