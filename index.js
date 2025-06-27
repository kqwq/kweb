// Require the necessary discord.js classes
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import { readdirSync, readFileSync } from 'fs'
import { getKV, initKv } from './kv.js'
import { handleReaction } from './commands/reaction-role.js'
import { detectLanguageAndCode, runJavaScriptCode, runPythonCode } from './runCode.js'
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

client.once('ready', readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
  fetchReactionRoleMessages()
})

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
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
  } else if (interaction.isContextMenuCommand()) {
    if (interaction.commandName === 'Run Code') {
      const { language, code } = detectLanguageAndCode(interaction.targetMessage.content)
      if (language === 'python') {
        await runPythonCode(interaction, code)
      } else if (language === 'javascript') {
        await runJavaScriptCode(interaction, code)
      } else {
        interaction.reply('I can only run Python and JavaScript code right now, not `' + language + '`.')
      }
    }
  }
})


client.on('messageReactionAdd', async (reaction, user) => {
  handleReaction(reaction, user, true)
})

client.on('messageReactionRemove', async (reaction, user) => {
  handleReaction(reaction, user, false)
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
