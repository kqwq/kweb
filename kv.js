import { Collection } from 'discord.js'
import fs from 'fs'

const kvFile = 'kv.json'
let kv = null

function initKv() {
  if (!kv) {
    kv = new Collection()
    if (fs.existsSync(kvFile)) {
      const kvData = JSON.parse(fs.readFileSync(kvFile, 'utf8'))
      for (const [key, value] of Object.entries(kvData)) {
        kv.set(key, value)
      }
    } else {
      fs.writeFileSync(kvFile, JSON.stringify({}), 'utf8')
    }
  }
}

function setKV(key, value) {
  if (!kv) initKv()
  kv.set(key, value)
  fs.writeFileSync(kvFile, JSON.stringify(Object.fromEntries(kv)), 'utf8')
}

function getKV(key) {
  if (!kv) initKv()
  return kv.get(key)
}

function deleteKV(key) {
  if (!kv) initKv()
  kv.delete(key)
  fs.writeFileSync(kvFile, JSON.stringify(Object.fromEntries(kv)), 'utf8')
}

export { initKv, setKV, getKV, deleteKV }