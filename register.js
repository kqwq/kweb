import { ApplicationCommandType, REST, Routes } from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'
const { clientId, guildId, token } = JSON.parse(fs.readFileSync('config.json', 'utf-8'))

const commands = [
  {
    name: 'Run Code',
    type: ApplicationCommandType.Message
  }
]

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`)
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON())
  } else {
    console.log(`[WARNING] The command at ./commands/${file} is missing a required "data" or "execute" property.`)
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token)

// and deploy your commands!
try {
  console.log(`Started refreshing ${commands.length} application (/) commands.`)

  // The put method is used to fully refresh all commands in the guild with the current set
  const data = await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands },
  )

  console.log(`Successfully reloaded ${data.length} application (/) commands.`)
} catch (error) {
  // And of course, make sure you catch and log any errors!
  console.error(error)
}

