const line = require('@line/bot-sdk')
const express = require('express')
const axios = require('axios')
const pokeData = require('./poke.json')
require('dotenv').config()

// 環境変数からチャネルアクセストークンとチャネルシークレットを取得する
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

// LINE クライアントを生成する
const client = new line.Client(config)

// Express アプリを生成する
const app = express()

// LINE Bot SDK が提供するミドルウェアを挟み込み、リクエストヘッダの署名検証や JSON パースなどを任せてしまう
app.post('/callback', line.middleware(config), (req, res) => {
  // 1回のリクエストに複数のメッセージが含まれていたりすることもあるので
  // イベントの配列を1件ずつ取得して処理してやる
  const events = req.body.events
  Promise.all(events.map((event) => {
    // イベント1件を処理する・エラー時も例外を伝播しないようにしておく
    return handleEvent(event).catch(() => { return null; })
  })
    .then((result) => {
      // 全てのイベントの処理が終わったら LINE API サーバには 200 を返す
      res.status(200).json({}).end()
    })
  )
})

async function getPoke() {
  const res = await axios.get('https://pokeapi.co/api/v2/pokemon/25')
  const speedStaus = res.data.stats[5].base_stat

  const speedList = getPokemonSpeed(speedStaus)
  console.log(speedList)
  console.log(res.data.id)
  console.log(res.data.stats[5].base_stat)
  console.log(pokeData[res.data.id - 1].name_ja)
}

const getPokemonSpeed = (speed => {
  const result = {}

  // 最速実数値の計算
  const maxSpeed = Math.floor((speed + 52) * 1.1)

  // 準速実数値の計算
  const semiSpeed = speed + 52

  // 無振り実数値の計算
  const normalSpeed = Math.floor((((speed * 2) + 31) * 0.5) + 5)

  result['maxSpeed'] = maxSpeed
  result['semiSpeed'] = semiSpeed
  result['normalSpeed'] = normalSpeed

  return result
})

app.get('/test', (req, res) => {
  getPoke()
  return res.json('pokemon')
})

/**
 * イベント1件を処理する
 * 
 * @param {*} event イベント
 * @return {Promise} テキストメッセージイベントの場合は client.pushMessage() の結果、それ以外は null
 */

function handleEvent(event) {
  // メッセージイベントではない場合、テキスト以外のメッセージの場合は何も処理しない
  if(event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null)
  }
  
  // 返信用メッセージを組み立てる : ユーザからのメッセージにカギカッコを付けて返信してみる
  const echoMessage = {
    type: 'text',
    text: `「${event.message.text}」`
  }
  
  // Reply API を利用してリプライする
  return client.replyMessage(event.replyToken, echoMessage)
  // Push API を利用する場合は以下のようにする
  // return client.pushMessage(event.source.userId, echoMessage)
}

app.listen(process.env.PORT)
console.log(`ポート${process.env.PORT}番でExpressサーバーを実行中です…`)
