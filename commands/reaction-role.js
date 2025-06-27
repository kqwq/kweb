import { SlashCommandBuilder } from "discord.js"
import { getKV, setKV } from "../kv.js"

/**
 * 
 * @param {import("discord.js").MessageReaction} reaction 
 * @param {import("discord.js").User} user
 */
const handleReaction = async (reaction, user, isAdd) => {
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
    if (isAdd) {
      await member.roles.add(role)
      console.log(`Added role ${role.name} to ${member.user.tag}`)
    } else {
      await member.roles.remove(role)
      console.log(`Removed role ${role.name} from ${member.user.tag}`)
    }
  }
}



const data = new SlashCommandBuilder()
  .setName("reaction-role")
  .setDescription("Assign a role when a user reacts with an emoji to a message")
  .addRoleOption(option =>
    option.setName("role")
      .setDescription("The role to assign")
      .setRequired(true))
  .addStringOption(option =>
    option.setName("emoji")
      .setDescription("The emoji to react with")
      .setRequired(true))
  .addStringOption(option =>
    option.setName("message_id")
      .setDescription("The ID of the message to react to")
      .setRequired(false))


/**
 * 
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @returns 
 */
async function execute(interaction) {
  // Block if the user does not have the MANAGE_ROLES permission
  if (!interaction.member.permissions.has("ManageRoles")) {
    return interaction.reply({
      content: "You do not have permission to manage roles.",
      ephemeral: true
    })
  }

  // Get the role, emoji, and message ID from the interaction options
  const role = interaction.options.getRole("role")
  const emoji = interaction.options.getString("emoji")
  const messageId = interaction.options.getString("message_id") ?? interaction.channel.lastMessageId

  // Error handling for missing role or emoji
  const message = await interaction.channel.messages.fetch(messageId)
  if (!message) {
    return interaction.reply({
      content: "Message not found. Please provide a valid message ID.",
      ephemeral: true
    })
  }
  // Try to resolve the emoji: first as a custom emoji, then as a unicode emoji
  let reactionEmoji = interaction.client.emojis.cache.find(e => e.name === emoji || e.id === emoji)
  if (!reactionEmoji) {
    // Check if it's a valid unicode emoji (basic check)
    const emojiRegex = /\p{Emoji}/u
    if (emojiRegex.test(emoji)) {
      reactionEmoji = emoji
    }
  }
  if (!reactionEmoji) {
    return interaction.reply({
      content: "Emoji not found. Please provide a valid emoji.",
      ephemeral: true
    })
  }

  // Remember this rule
  const reactionRoles = getKV("reactionRoles") || []
  reactionRoles.push({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: message.id,
    emoji: reactionEmoji.toString(),
    roleId: role.id
  })
  setKV("reactionRoles", reactionRoles)

  // Set up the reaction role
  await message.react(reactionEmoji)
  await interaction.reply({
    content: `Reaction added with ${reactionEmoji} to message ID ${message.id}. Users can now react to this message to get the ${role.name} role.`,
    ephemeral: true
  })
}

export { data, execute, handleReaction }