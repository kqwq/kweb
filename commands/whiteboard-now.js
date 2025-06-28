import { SlashCommandBuilder } from "discord.js"



const data = new SlashCommandBuilder()
  .setName("whiteboard-now")
  .setDescription("What's on the kyle.ro whiteboard right now?")
  .addStringOption(option =>
    option.setName("background")
      .setDescription("Background color for the whiteboard image. Deafult is white.")
      .addChoices(
        { name: 'White', value: 'white' },
        { name: 'Transparent', value: 'trans' },
      )
  )



/**
 * 
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @returns 
 */
async function execute(interaction) {
  // Download and send the image at https://kyle.ro/api/get-whiteboard
  const response = await fetch('https://kyle.ro/api/get-whiteboard')
  if (!response.ok) {
    return interaction.reply({ content: 'Whiteboard API is unavailable! This shouldn\'t happen...' })
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const attachment = {
    attachment: buffer,
    name: 'whiteboard.png'
  }
  const embed = {
    title: "What's on the whiteboard?",
    description: "https://kyle.ro/whiteboard",
    image: { url: 'attachment://whiteboard.png' },
    color: 0xB0EFFF, // mauve color
    fields: [
      {
        name: 'Date',
        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
        inline: false
      }
    ]
  }
  await interaction.reply({
    embeds: [embed],
    files: [attachment]
  })



}

export { data, execute }