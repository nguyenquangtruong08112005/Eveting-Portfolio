const social = require('@/providers/database/social.helper');

function makeClient() {
  return { query: jest.fn() };
}

describe('loadFollowedProfileIds', () => {
  it('queries user_follows and maps followee ids', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [{ followee_id: 'u2' }, { followee_id: 'u3' }] });

    const result = await social.loadFollowedProfileIds(client, 'u1');

    expect(client.query).toHaveBeenCalledWith(
      'SELECT followee_id FROM user_follows WHERE follower_id = $1 ORDER BY created_at',
      ['u1']
    );
    expect(result).toEqual(['u2', 'u3']);
  });

  it('returns an empty array when there are no rows', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(social.loadFollowedProfileIds(client, 'u1')).resolves.toEqual([]);
  });
});

describe('loadHistoryEventIds', () => {
  it('queries user_event_history ordered by attended_at DESC and maps event ids', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [{ event_id: 'e1' }, { event_id: 'e2' }] });

    const result = await social.loadHistoryEventIds(client, 'u1');

    expect(client.query).toHaveBeenCalledWith(
      'SELECT event_id FROM user_event_history WHERE user_id = $1 ORDER BY attended_at DESC',
      ['u1']
    );
    expect(result).toEqual(['e1', 'e2']);
  });

  it('returns an empty array when there are no rows', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(social.loadHistoryEventIds(client, 'u1')).resolves.toEqual([]);
  });
});

describe('loadFcmTokens', () => {
  it('queries user_devices and maps fcm tokens', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [{ fcm_token: 'tok-a' }, { fcm_token: 'tok-b' }] });

    const result = await social.loadFcmTokens(client, 'u1');

    expect(client.query).toHaveBeenCalledWith(
      'SELECT fcm_token FROM user_devices WHERE user_id = $1',
      ['u1']
    );
    expect(result).toEqual(['tok-a', 'tok-b']);
  });

  it('returns an empty array when there are no rows', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(social.loadFcmTokens(client, 'u1')).resolves.toEqual([]);
  });
});

describe('loadFcmTokensForUsers', () => {
  it('returns an empty object without querying when userIds is empty', async () => {
    const client = makeClient();

    await expect(social.loadFcmTokensForUsers(client, [])).resolves.toEqual({});
    await expect(social.loadFcmTokensForUsers(client, null)).resolves.toEqual({});
    await expect(social.loadFcmTokensForUsers(client, undefined)).resolves.toEqual({});
    expect(client.query).not.toHaveBeenCalled();
  });

  it('queries with ANY($1::text[]) and groups tokens by user id', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({
      rows: [
        { user_id: 'u1', fcm_token: 'tok-a' },
        { user_id: 'u1', fcm_token: 'tok-b' },
        { user_id: 'u2', fcm_token: 'tok-c' },
      ],
    });

    const result = await social.loadFcmTokensForUsers(client, ['u1', 'u2']);

    expect(client.query).toHaveBeenCalledWith(
      'SELECT user_id, fcm_token FROM user_devices WHERE user_id = ANY($1::text[])',
      [['u1', 'u2']]
    );
    expect(result).toEqual({ u1: ['tok-a', 'tok-b'], u2: ['tok-c'] });
  });

  it('omits users without any rows', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [{ user_id: 'u1', fcm_token: 'tok-a' }] });

    const result = await social.loadFcmTokensForUsers(client, ['u1', 'ghost']);

    expect(result).toEqual({ u1: ['tok-a'] });
  });
});

describe('replaceFollows', () => {
  it('only deletes when followeeIds is not an array', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceFollows(client, 'u1', null);
    await social.replaceFollows(client, 'u1', 'not-array');

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM user_follows WHERE follower_id = $1',
      ['u1'],
    ]);
  });

  it('only deletes when followeeIds is empty', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceFollows(client, 'u1', []);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][0]).toContain('DELETE FROM user_follows');
  });

  it('deletes then inserts each followee with the shared timestamp', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceFollows(client, 'u1', ['u2', 'u3']);

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM user_follows WHERE follower_id = $1',
      ['u1'],
    ]);
    for (let i = 1; i <= 2; i++) {
      const [sql, params] = client.query.mock.calls[i];
      expect(sql).toBe(
        `INSERT INTO user_follows (follower_id, followee_id, created_at)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`
      );
      expect(params).toEqual(['u1', `u${i + 1}`, expect.any(Date)]);
    }
    expect(client.query.mock.calls[1][1][2]).toBe(client.query.mock.calls[2][1][2]);
  });
});

describe('replaceHistory', () => {
  it('only deletes when eventIds is not an array', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceHistory(client, 'u1', undefined);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM user_event_history WHERE user_id = $1',
      ['u1'],
    ]);
  });

  it('deletes then inserts each event with source history', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceHistory(client, 'u1', ['e1', 'e2']);

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM user_event_history WHERE user_id = $1',
      ['u1'],
    ]);
    for (let i = 1; i <= 2; i++) {
      const [sql, params] = client.query.mock.calls[i];
      expect(sql).toBe(
        `INSERT INTO user_event_history (user_id, event_id, source, attended_at)
             VALUES ($1, $2, 'history', $3) ON CONFLICT DO NOTHING`
      );
      expect(params).toEqual(['u1', `e${i}`, expect.any(Date)]);
    }
  });
});

describe('replaceDevices', () => {
  it('only deletes when tokens is not an array', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceDevices(client, 'u1', null);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM user_devices WHERE user_id = $1',
      ['u1'],
    ]);
  });

  it('skips falsy tokens and assigns sequential device ids', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceDevices(client, 'u1', ['tok-a', '', null, 'tok-b']);

    expect(client.query).toHaveBeenCalledTimes(3);
    const [, insertA] = client.query.mock.calls[1];
    const [, insertB] = client.query.mock.calls[2];
    expect(insertA).toEqual(['dev_u1_0', 'u1', 'tok-a', expect.any(Date)]);
    expect(insertB).toEqual(['dev_u1_1', 'u1', 'tok-b', expect.any(Date)]);
  });

  it('uses ON CONFLICT to re-assign user_id for an existing token', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceDevices(client, 'u1', ['tok-a']);

    const sql = client.query.mock.calls[1][0];
    expect(sql).toBe(
      `INSERT INTO user_devices (id, user_id, fcm_token, last_seen_at, created_at)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT (fcm_token) DO UPDATE SET user_id = EXCLUDED.user_id, last_seen_at = EXCLUDED.last_seen_at`
    );
  });
});

describe('loadFeaturedProfileIds', () => {
  it('queries event_featured_profiles ordered by sort_order and maps profile ids', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({
      rows: [{ featured_profile_id: 'fp1' }, { featured_profile_id: 'fp2' }],
    });

    const result = await social.loadFeaturedProfileIds(client, 'e1');

    expect(client.query).toHaveBeenCalledWith(
      `SELECT featured_profile_id FROM event_featured_profiles
         WHERE event_id = $1 ORDER BY sort_order ASC`,
      ['e1']
    );
    expect(result).toEqual(['fp1', 'fp2']);
  });

  it('returns an empty array when there are no rows', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await expect(social.loadFeaturedProfileIds(client, 'e1')).resolves.toEqual([]);
  });
});

describe('loadFeaturedProfileIdsForEvents', () => {
  it('returns an empty object without querying when eventIds is empty', async () => {
    const client = makeClient();

    await expect(social.loadFeaturedProfileIdsForEvents(client, [])).resolves.toEqual({});
    await expect(social.loadFeaturedProfileIdsForEvents(client, null)).resolves.toEqual({});
    await expect(social.loadFeaturedProfileIdsForEvents(client, undefined)).resolves.toEqual({});
    expect(client.query).not.toHaveBeenCalled();
  });

  it('groups featured profile ids per event preserving sort order', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({
      rows: [
        { event_id: 'e1', featured_profile_id: 'fp1', sort_order: 0 },
        { event_id: 'e1', featured_profile_id: 'fp2', sort_order: 1 },
        { event_id: 'e2', featured_profile_id: 'fp3', sort_order: 0 },
      ],
    });

    const result = await social.loadFeaturedProfileIdsForEvents(client, ['e1', 'e2']);

    expect(client.query).toHaveBeenCalledWith(
      `SELECT event_id, featured_profile_id, sort_order
         FROM event_featured_profiles
         WHERE event_id = ANY($1::text[])
         ORDER BY sort_order ASC`,
      [['e1', 'e2']]
    );
    expect(result).toEqual({ e1: ['fp1', 'fp2'], e2: ['fp3'] });
  });
});

describe('replaceFeaturedProfiles', () => {
  it('only deletes when profileIds is not an array', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceFeaturedProfiles(client, 'e1', undefined);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM event_featured_profiles WHERE event_id = $1',
      ['e1'],
    ]);
  });

  it('skips ids missing from featured_profiles and increments sort only for linked ones', async () => {
    const client = makeClient();
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    await social.replaceFeaturedProfiles(client, 'e1', ['ghost', 'fp1', 'fp2']);

    expect(client.query).toHaveBeenCalledTimes(6);
    expect(client.query.mock.calls[0]).toEqual([
      'DELETE FROM event_featured_profiles WHERE event_id = $1',
      ['e1'],
    ]);
    expect(client.query.mock.calls[1]).toEqual(['SELECT 1 FROM featured_profiles WHERE id = $1', ['ghost']]);
    expect(client.query.mock.calls[2]).toEqual(['SELECT 1 FROM featured_profiles WHERE id = $1', ['fp1']]);
    expect(client.query.mock.calls[3]).toEqual([
      `INSERT INTO event_featured_profiles (event_id, featured_profile_id, sort_order, created_at)
             VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      ['e1', 'fp1', 0, expect.any(Date)],
    ]);
    expect(client.query.mock.calls[4]).toEqual(['SELECT 1 FROM featured_profiles WHERE id = $1', ['fp2']]);
    expect(client.query.mock.calls[5][1]).toEqual(['e1', 'fp2', 1, expect.any(Date)]);
  });

  it('only deletes when profileIds is empty', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ rows: [] });

    await social.replaceFeaturedProfiles(client, 'e1', []);

    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
