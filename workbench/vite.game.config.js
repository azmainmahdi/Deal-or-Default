// `npm run game`: the same dev server, but the root page sends you to the workbench game
export default {plugins:[{name:'game-root',configureServer(s){s.middlewares.use((q,r,n)=>{if(q.url==='/'){r.statusCode=302;r.setHeader('Location','/workbench/game.html');r.end()}else n()})}}]}
