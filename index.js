// Require the necessary discord.js classes
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import { readdirSync, readFileSync } from 'fs'
import { getKV, initKv } from './kv.js'
const config = JSON.parse(readFileSync('config.json', 'utf-8'))

// The token of your bot - https://discord.com/developers/applications
const token = config.token || process.env.DISCORD_TOKEN

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION', 'USER'],
})

// Set up key/value storage
initKv()

// For every file in commands, add it to client.commands
client.commands = new Collection()
const files = readdirSync('./commands').filter(file => file.endsWith('.js'))
await Promise.all(
  files.map(async (element) => {
    const command = await import(`./commands/${element}`)
    if (command && command.data && command.execute) {
      client.commands.set(command.data.name, command)
    } else {
      console.error(`Command file ${element} is missing data or execute properties.`)
    }
  })
)

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
  fetchReactionRoleMessages()
})

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return
  const command = client.commands.get(interaction.commandName)
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }
  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error)
    await interaction.reply({
      embeds: [
        {
          title: 'Error',
          description: `There was an error while executing this command!\n\`\`\`${error.message}\`\`\``,
          color: 0xff0000
        }
      ],
    })
  }
})


client.on('messageReactionAdd', async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return

  // Check if reaction is on one of the messages you're tracking
  const reactionRoles = getKV('reactionRoles') || []
  const match = reactionRoles.find(role =>
    reaction.message.id === role.messageId &&
    reaction.message.channel.id === role.channelId &&
    reaction.message.guild.id === role.guildId
  )

  if (!match) return // Not a message we care about

  // Handle the reaction
  const guild = reaction.message.guild
  const member = guild.members.cache.get(user.id)
  const role = guild.roles.cache.get(match.roleId)

  if (role && member) {
    await member.roles.add(role)
    console.log(`Added role ${role.name} to ${member.user.tag}`)
  }
})

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return

  const reactionRoles = getKV('reactionRoles') || []
  const match = reactionRoles.find(role =>
    reaction.message.id === role.messageId &&
    reaction.message.channel.id === role.channelId &&
    reaction.message.guild.id === role.guildId
  )

  if (!match) return

  const guild = reaction.message.guild
  const member = guild.members.cache.get(user.id)
  const role = guild.roles.cache.get(match.roleId)

  if (role && member) {
    await member.roles.remove(role)
    console.log(`Removed role ${role.name} from ${member.user.tag}`)
  }
})

// On startup, fetch all reaction roles from kv.json
async function fetchReactionRoleMessages() {
  const reactionRoles = getKV('reactionRoles') || []
  for (const role of reactionRoles) {
    try {
      const guild = await client.guilds.fetch(role.guildId)
      const channel = await guild.channels.fetch(role.channelId)
      const message = await channel.messages.fetch(role.messageId)
    } catch (error) {
      console.error(`Failed to fetch reaction role message: ${error.message}`)
      continue
    }
  }
}

// Log in to Discord with your client's token
client.login(token)
