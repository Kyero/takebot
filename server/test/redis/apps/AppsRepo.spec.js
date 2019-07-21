import redis from '#/src/redis/PromiseRedis'
import AppsRepo from '#/src/redis/apps/AppsRepo'

describe('AppsRepo', () => {
  const AppsRepoKey = "TakeBot:apps"
  const TakenAppsKey = `${AppsRepoKey}:taken`
  let redisClient
  let subject

  beforeAll(() => { redisClient = redis.createClient({url: process.env.REDIS_URL}) })
  afterAll(() => { redisClient.quit() })

  afterEach(async () => await redisClient.flushall())
  beforeEach(() => { subject = new AppsRepo(redisClient, "TakeBot") })

  describe('#add', () => {
    it('adds an app to the repo', async () => {
      await subject.add('appZZ')
      expect(await subject.list()).toContain('appZZ')
    })

    it('adds multiple apps to the repo', async () => {
      await subject.add('appZZ', 'appXX')
      const list = await subject.list()
      expect(list).toContain('appZZ')
      expect(list).toContain('appXX')
    })

    it('adding an already existing app takes no effect', async () => {
      await subject.add('appYY')
      await subject.add('appYY')

      const applist = (await subject.list()).filter(a => a == 'appYY')
      expect(applist.length).toEqual(1)
    })
  })

  describe('#remove', () => {
    it('removes an app from the repo', async () => {
      await subject.add('appA')
      expect(await subject.list()).toContain('appA')

      await subject.remove('appA')
      expect(await subject.list()).not.toContain('appA')
    })

    it('removes multiple apps from the repo', async () => {
      await subject.add('appA', 'appB', 'appC')
      const listBefore = await subject.list()
      expect(listBefore).toContain('appA')
      expect(listBefore).toContain('appB')
      expect(listBefore).toContain('appC')

      await subject.remove('appA', 'appB')
      const listAfter = await subject.list()
      expect(listAfter).not.toContain('appA')
      expect(listAfter).not.toContain('appB')
      expect(listAfter).toContain('appC')
    })

    it('removing a non existing app takes no effect', async () => {
      const listBefore = await subject.list()
      await subject.remove('appA')
      const listAfter = await subject.list()

      expect(listAfter).toEqual(listBefore)
    })
  })

  describe('#list', () => {
    it('returns the list of apps given', async () => {
      await redisClient.sadd(AppsRepoKey, 'appA', 'appB')
      const list = await subject.list()
      expect(list).toContain('appA')
      expect(list).toContain('appB')
    })
  })

  describe('#take', () => {
    const app = "appA"
    const expectedUser = "TheUserThatTookIt"

    it('sets an app as taken by the given user', async () => {
      await subject.take(app, expectedUser)
      const user = await redisClient.hget(TakenAppsKey, app)
      expect(user).toEqual(expectedUser)
    })
  })

  describe('#release', () => {
    const app = "appA"
    const expectedUser = "TheUserThatTookIt"

    beforeEach(async () => await redisClient.hset(TakenAppsKey, app, expectedUser))

    it('releases the app', async () => {
      await subject.release(app)
      const user = await redisClient.hget(TakenAppsKey, app)
      expect(user).toBeNull()
    })
  })

  describe('#holder', () => {
    const app = "appA"
    const user = "TheUserThatIsHoldingTheApp"
    beforeEach(async () => await redisClient.hset(TakenAppsKey, app, user))
    afterEach(async () => await redisClient.hdel(TakenAppsKey, app, user))

    it('returns the holder of an app', async () => {
      expect(await subject.holder("appA")).toEqual(user)
    })

    describe('when app is not taken', () => {
      beforeEach(async () => await redisClient.hdel(TakenAppsKey, app, user))

      it('returns null', async () => {
        expect(await subject.holder("appA")).toBeNull()
      })
    })
  })

  describe('#takenApps', () => {
    it('reports all taken apps', async () => {
      await redisClient.hset(TakenAppsKey, "app1", "user1")
      await redisClient.hset(TakenAppsKey, "app2", "user3")
      await redisClient.hset(TakenAppsKey, "app3", "user3")
      await redisClient.hset(TakenAppsKey, "app4", "user2")

      expect(await subject.takenApps()).toMatchObject({
        "app1": "user1",
        "app2": "user3",
        "app3": "user3",
        "app4": "user2",
      })
    })

    it('when there are no taken apps, coalesces to an empty map', async () => {
      expect(await subject.takenApps()).toMatchObject({})
    })
  })

  describe('#appStatus', () => {
    // TODO: this
  })
})