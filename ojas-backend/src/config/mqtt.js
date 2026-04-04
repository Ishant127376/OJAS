import mqtt from 'mqtt'

const MQTT_URL = process.env.MQTT_URL
const MQTT_USERNAME = process.env.MQTT_USERNAME
const MQTT_PASSWORD = process.env.MQTT_PASSWORD

let mqttClient = null

const createClient = () => {
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 20000,
    clean: true,
  })

  client.on('connect', () => {
    console.log('MQTT backend client connected')
  })

  client.on('error', (error) => {
    console.error('MQTT backend client error:', error.message)
  })

  client.on('reconnect', () => {
    console.log('MQTT backend client reconnecting...')
  })

  return client
}

export const getMqttClient = () => {
  if (!MQTT_URL || !MQTT_USERNAME || !MQTT_PASSWORD) {
    console.warn('MQTT env vars missing. Skipping MQTT client initialization.')
    return null
  }

  if (mqttClient) {
    return mqttClient
  }

  mqttClient = createClient()

  return mqttClient
}

export const client = getMqttClient()

export default client
