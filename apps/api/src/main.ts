import { createApp } from './composition-root'

const app = createApp()
const port = Number(process.env.PORT ?? 3000)

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`)
  console.log(`Swagger docs at http://localhost:${port}/api/v1/swagger`)
})
