const fs = require("fs/promises");
//import ws = require("ws");
import { MakeGenerator } from "./NumberGenerator";
//import { Server, WebSocket } from "ws";
const {Server} = require('ws');

//command npm run launch. This will compile into javascript and then run.


/**
 * stuff for docker file
 *
 *  "cpyjson" : "cp ./CapExServer/*.json ./CapExServer/build/",
 *  "launch" : "tsc ./CapExServer/CapitalExchangeServer.ts ./CapExServer/NumberGenerator.ts --outDir ./CapExServer/build/
 *   npm run cpyjson && npm run launch:run",
 * "launch:run" : " node ./CapExServer/build/CapitalExchangeServer.js"
 *
 *  require("simplex-noise");
 *  require("alea");
 *
 */

const PathToData = "./build/StockConfig.json";
const port = 8722;
const mygen = MakeGenerator("0",0,10);
const MAXLOADSIZE = 5 * 1000 * 1024; //1 mb

mygen.setLimit(MAXLOADSIZE);

//mygen.setSeed(JSON.stringify("0"));
//mygen.setMinMax(0,400);
//const res = mygen.collapse(1670775776028,1670775817446,1000);
//console.log("tested",res.length);

const BadRequest = (res : any = "",action : string = "default") => {
  return {"reason" : `Bad Request : ${res}`,
  "status" : 0,
  msg:action
}};
const GoodRequest = (res : any = null,action : string = "default") => {
  return {"status" : 1,
  "data" : res,
  "msg" : action
}};

//const myGen = MakeGenerator(0);
let datapack : {[name : string] : any};
const information : {[name : string] : any} = {};
const liveFeeds : {[name : string] : any} = {};
const timerFeeds : Array<any> = [];

const subscriptions : {[name : string] : any} = {};


fs.readFile(PathToData).then((val : string)=>{
  datapack = JSON.parse(val.toString());
  information.tickers = Object.keys(datapack);

  launchServer();
})



function launchServer(){
  const server = new Server({port : port,maxPayload : MAXLOADSIZE});
  console.log(`hosting at ${"localhost"}:${8722}`)
  //automatically close a connection
  const pingInterval = setInterval(()=>{
    server.clients.forEach(function(socket : WebSocket | any) {
      //console.log("running");
      if(socket.isAlive == false){
        RemoveFromSubList(socket);
        socket.terminate();
        console.log("closing socket");
      }
      socket.isAlive = false;
      socket.ping();

    });
  },3000)
  //on server close
  server.on('close',()=>{
    clearInterval(pingInterval)
    for(const obj of timerFeeds){
      clearInterval(obj);
    }
  })
  //on connect
  server.on("connection",(socket : any | WebSocket)=>{
    //setup heart beat
    socket.isAlive = true;
    socket.on('pong',function(this : WebSocket | any){this.isAlive = true;})
    //setup socket defaults
    socket.SubList = [];


    //communication between server/client
    socket.on("message",async (msg : any,isBin : any) =>{
      let data : {[name : string] : any};
      try{
        data = isBin ? JSON.parse(msg.toString()) : JSON.parse(msg);
      }catch(e) {
        console.error("Sent Bad Request");
        socket.send(JSON.stringify(BadRequest("Bad Json","Any")));
        return;
      }

      const direction = data.msg;

      if(direction == "GetIndexTickers"){
        const res = GoodRequest(information.tickers,direction);
        socket.send(JSON.stringify(res));
        console.log("Sent Names");

      } else if(direction == "getTickerInfo") {
        //bad ticker/body
        if(!data.ticker || !information.tickers.includes(data.ticker)){
          const res = BadRequest("Bad ticker, 'ticker' may be missing",direction);
          socket.send(JSON.stringify(res));
        }else {
          const info = information.tickers[data.ticker];
          const res = GoodRequest(datapack[data.ticker],direction);
          socket.send(JSON.stringify(res));
        }
      }else if(direction == "subscribe") {
        //{ "msg" : "subscribe", "ticker" : "CRRPT", "start" :1670775776028, "period" : 1000 }
        const c1 = !data.ticker || !information.tickers.includes(data.ticker);
        const c2 = !data.start || !data.period;
        //bad request
        if(c1 || c2){
          const res = BadRequest("Subscribe : Bad Fields",direction);
          socket.send(JSON.stringify(res));
        }else{
          //good to grab and send data
          const end = new Date().getTime();

          try{
            //send fill data
            if(data.start){
              const res = getData(data.ticker,data.period,data.start,end);
              const pckg = {
                data : res,
                ticker : data.ticker,
                period : data.period
              }
              socket.send(JSON.stringify(GoodRequest(pckg,direction)));
            }
            //subscribe to ticker
            MakeUpdateTimer(socket,data,end,direction);

          }catch(e){
            console.error("Bad Subscription",e);
            socket.send(JSON.stringify(BadRequest("Runtime Error : Something Happened",direction)))
          }
        }

      }else if(direction == "unsubscribe") {
        //socket needs to have a ticker, ticker in ticker list and period
        const c1 = data.ticker || data.period || !information.tickers.includes(data.ticker);
        //make safe to unsubscribe
        if(!c1){
          socket.send(JSON.stringify(BadRequest("Missing or invalid headers",direction)));
          return;
        }

        let found = false;
        //remove from livefeeds
        liveFeeds[data.period] = liveFeeds[data.period].filter(function(itm : any){
          return itm.socket != socket && itm.data.ticker == data.data.ticker;
        });

        //remove from sub list
        socket.SubList = socket.SubList.filter(function(itm : {[name : string] : any}){
          const sockperiod = itm.period;
          const sockticker = itm.ticker;
          if(sockperiod == data.period && sockticker == data.ticker){
            found = true;
            return false;
          }
          return true;
        })

        if(found){
          socket.send(JSON.stringify(GoodRequest({found : true},direction)));
        }else {
          socket.send(JSON.stringify(GoodRequest({found : false},direction)));
        }

      }else if(direction == "fetch"){
        //a single lump of data
        //start,end,ticker
        const c1 = !data.ticker || !information.tickers.includes(data.ticker);
        const c2 = !data.start || !data.end || !data.period;
        if(c1 || c2){
          const res = BadRequest("Fetch : Bad Fields",direction);
          socket.send(JSON.stringify(res));
        }else {
          //good to go, try to send data
          try{
            const res = getData(data.ticker,data.period,data.start,data.end);
            const pckg = {
              data : res,
              ticker : data.ticker,
              period : data.period
            }
            socket.send(JSON.stringify(GoodRequest(pckg,direction)));
          }catch(e){
            console.error(e);
            socket.send(JSON.stringify(BadRequest("Runtime Error : Something Happened",direction)))
          }
        }

      }
    })
  })

  return server;
}

type SList = {
  SubList : Array<{[name : string] : any}>
}

//Makes a timer if it doens't exists for that resolution yet
//if it does exists, pushes back the resolution
function MakeUpdateTimer(asocket : WebSocket & SList,data : {[name : string] : any}, end : string | number,direction : string){
  //checks to make sure not already subscribed
  for(let i = 0; i < asocket.SubList.length;i++){
    const c1 = asocket.SubList[i].period == data.period;
    const c2 = asocket.SubList[i].ticker == data.ticker;
    if(c1 && c2){
      return;
    }
  }
  let notExists = !liveFeeds[data.period];
  //doesn't exists
  if(notExists){
    liveFeeds[data.period] = []
  }
  //add information
  liveFeeds[data.period].push({data :data,end : end,socket : asocket});
  //set timer
  notExists && setInterval(()=>{
    UpdateFeeds(data.period,direction);
  },data.period)
  //push back SubList data.period
  asocket.SubList.push(data);
}

function RemoveFromSubList(asocket : WebSocket & SList){
  //iterate over the categories
  for(const category in asocket.SubList){
    if(liveFeeds[category]){
      //iterate over the connections
      for(let i = liveFeeds[category].length - 1; i >= 0;i--){
        const feed = liveFeeds[category][i];
        //check if they are equal
        if(feed.socket == asocket){
          delete liveFeeds[category][i];
        }
      }
    }
  }
}


function UpdateFeeds(name : number | string,direction : string){
  //send information to these sockets
  for(let i = 0; i < liveFeeds[name].length; i++){
    const data = liveFeeds[name][i].data;
    const start = liveFeeds[name][i].end;
    const end = new Date().getTime();

    const res = getData(data.ticker,data.period,start,end);
    liveFeeds[name].end = start;

    const msg = GoodRequest(res,direction);
    const sock = liveFeeds[name][i].socket;
    sock.send(JSON.stringify(msg));
  }
}



function getData(
  ticker : string,
  period : number,
  start : number,
  end : number) : Array<{[name : string] : any}>{

    const tickInfo = datapack[ticker];
    const min = tickInfo.min ? tickInfo.min : 0;
    const max = tickInfo.max ? tickInfo.max : 400;

    const newSeed = typeof(tickInfo.seed) == 'string' ? tickInfo.seed : tickInfo.toString();
    mygen.setSeed(newSeed);
    mygen.setMinMax(min,max);
    //has built in size protection
    const res = mygen.collapse(start,end,period);

    return res;
}
