import { Locator } from '#/src/util/Locator'
import PromiseRedis from '#/src/redis/PromiseRedis'
import AppsRepo from '#/src/redis/apps/AppsRepo'
import RemindersRepo from '#/src/memory/reminders/RemindersRepo'
import ITakeNotifier from '#/src/core/ITakeNotifier'
import Messages from '#/src/messages'

// TODO: This is to be used on integration test. We don't wanna hit slack, but we
//       might wanna hit some faked API of some sort - stubby4node?
//       Regardless of what's used, we need to review this!
class MockedNotifier extends ITakeNotifier {
  constructor() {
    super()
    this.teamNotifications = []
    this.userNotifications = []
  }

  notifyUser = (user, message) => { this.userNotifications.push({user, message}) }
  notifyTeam = (message) => { this.teamNotifications.push({message}) }

  reset = () => {
    this.teamNotifications = []
    this.userNotifications = []
  }
}

const locator = Locator()
locator.singleton('redisClient', PromiseRedis.createClient({url: process.env['REDIS_URL']}))
       .singleton('appsRepo', new AppsRepo(locator.redisClient, process.env['ROOT_KEY']))
       .singleton('remindersRepo', new RemindersRepo())
       .singleton('notifier', new MockedNotifier())
       .singleton('messages', Messages)
       .onExit(() => {
         locator.redisClient.quit()
       })
       .onReset(() => {
         locator.redisClient.flushall()
         locator.notifier.reset()
         locator.remindersRepo.reset()
       })

export default locator
