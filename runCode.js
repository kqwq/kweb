import { spawn } from 'child_process'
import { MessageFlags } from 'discord.js'

/**
 * Detects the language and code from a Discord message's content.
 * @param {string} content - The content of the message to analyze
 * @returns {{language: string|null, code: string|null}}
 */
function detectLanguageAndCode(content) {
  const langCodeMatch = content.match(/```(\w+)\n([\s\S]*?)```/)

  const lang = langCodeMatch ? langCodeMatch[1].toLowerCase() : null
  const code = langCodeMatch ? langCodeMatch[2] : null
  if (lang === 'py' || lang === 'python') {
    return { language: 'python', code }
  } else if (lang === 'js' || lang === 'javascript') {
    return { language: 'javascript', code }
  } else {
    return { language: lang, code: null }
  }
}

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {string} code - The Python code to run
 * @returns {Promise<void>}
 */
async function runPythonCode(interaction, code) {
  let stdout = ''
  let stderr = ''
  await interaction.deferReply({ flags: MessageFlags.SuppressEmbeds })
  await new Promise((resolve, reject) => {
    try {
      const pythonProcess = spawn('firejail', ['--net=none', '--private', 'timeout', '5', 'python3', '-c', code])
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      pythonProcess.on('close', (code) => {
        if (code === 124) {
          stderr += '⏰ Timeout: The code took longer than 5 seconds to execute.'
        }
        resolve()
      })
      pythonProcess.on('error', (error) => {
        stderr += error.message
        resolve()
      })
    } catch (error) {
      stderr += `Error executing Python code: ${error.message}`
      resolve()
    }
  })

  // Send the stdout and stderr as 2 separate embeds on the same message
  const embeds = []
  if (stdout) {
    embeds.push({
      title: 'Output',
      description: `\`\`\`py\n${stdout}\n\`\`\``,
      color: 0x00ff00,
    })
  }
  if (stderr) {
    embeds.push({
      title: 'Error',
      description: `\`\`\`py\n${stderr}\n\`\`\``,
      color: 0xff0000,
    })
  }
  if (embeds.length === 0) {
    embeds.push({
      title: 'No Output',
      description: 'The code executed without any output.',
      color: 0xffff00,
    })
  }
  await interaction.editReply({ embeds: embeds })

}

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {string} code - The JavaScript code to run
 * @returns 
 */
async function runJavaScriptCode(interaction, code) {
  let stdout = ''
  let stderr = ''
  interaction.deferReply({ flags: MessageFlags.SuppressEmbeds })
  await new Promise((resolve, reject) => {
    try {
      const nodejsProcess = spawn('firejail', ['--net=none', '--private', 'timeout', '5', 'node', '-e', code])
      nodejsProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      nodejsProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      nodejsProcess.on('close', (code) => {
        if (code === 124) {
          stderr += '⏰ Timeout: The code took longer than 5 seconds to execute.'
        }
        resolve()
      })
      nodejsProcess.on('error', (error) => {
        stderr += error.message
        resolve()
      })
    } catch (error) {
      stderr += `Error executing JavaScript code: ${error.message}`
      resolve()
    }
  })
  const embeds = []
  if (stdout) {
    embeds.push({
      title: 'Output',
      description: `\`\`\`js\n${stdout}\n\`\`\``,
      color: 0x00ff00,
    })
  }
  if (stderr) {
    embeds.push({
      title: 'Error',
      description: `\`\`\`js\n${stderr}\n\`\`\``,
      color: 0xff0000,
    })
  }
  if (embeds.length === 0) {
    embeds.push({
      title: 'No Output',
      description: 'The code executed without any output.',
      color: 0xffff00,
    })
  }
  interaction.editReply({ embeds: embeds })
}





export { detectLanguageAndCode, runPythonCode, runJavaScriptCode }