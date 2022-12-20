# Capital Exchange Server Request Documentation

> ### Run `npm run launch` to build and run the server


## Creating a Websocket 


## Sending Information To The Server

> - `status` field in the response section can be used to understand if 
> the server recieved the information sent. `false` for failed to process and 
> `true` for when action has been recieved correctly
> - Max Payload Size roughtly 5 mb, which may not be 1 mb of data.
> If fetch/subscription start request requires more than this,
> the server prioritizes sending the beginning but not the end of this data.
> if you are requiring this much data, split requests into time ranges and then send


### <span style="color:red">**--------------------------------------**}</span>


### - Missing Fields

> - Client sends message with missing fields

```json
{
    "msg" : "getTickerInfo"
}

```

> - Server responds with 

```json 
{
    "reason": "Bad Request : Bad ticker, 'ticker' may be missing",
    "status": 0
}

```

### - Bad Request

> - Client sends an unparsable json file

```json
{
    "crah",
}
```

> - Server responds with 

```json 
{
    "reason": "Bad Request : Bad Json",
    "status": 0,
    "msg": "Any"
}

```

### <span style="color:red">**--------------------------------------**}</span>


### - Get Tickers

> - Client A request to server 

```json
{
  "msg" : "GetIndexTickers"
}
```

> - Server Responds with 

```json
{
    "status": 1,
    "data": [
        "CRRPT",
        "SYS1CPT",
        "EDGEFND"
    ],
    "msg": "GetIndexTickers"
}

```


### <span style="color:red">**--------------------------------------**}</span>


### - Get Ticker Data 
> - Client Requst to server

```json
{
  "msg" : "getTickerInfo",
  "ticker" : "SYS1CPT"
}
```

> - Server Responds with

```json
{
    "status": 1,
    "data": {
        "name": "Systic 1 Capitol",
        "seed": 34225,
        "wander": 0.3
    },
    "msg": "getTickerInfo"
}

```

### <span style="color:red">**--------------------------------------**}</span>

### <span style="color:red">**--------------------------------------**}</span>


### - One time data fetch
> - Client Requst to server

```json
{
    "msg" : "fetch",
    "ticker" : "CRRPT",
    "start" :1670775776028 ,
    "end" : 1670775817446,
    "period" : 1000
}
```

> - Server Responds with

```json
{
    "status": 1,
    "data": {
        "data" : [
            {
                "open": 195.8,
                "high": 195.8,
                "low": 93.97,
                "close": 93.97,
                "index": 1670775776500
            },
        ],
       "ticker" : "CRRPT",
       "period" : 1000
    },
    "msg": "fetch"
}

```

### <span style="color:red">**--------------------------------------**}</span>

### - Subscribe for ticker data
> - Client Requst to server

```json
{
    "msg" : "subscribe",
    "ticker" : "CRRPT",
    "start" :1670775776028,
    "period" : 1000
}
```

> - Server Responds with

```json
{
    "status": 1,
    "data": {
        "data" : [
            {
                "open": 236.6,
                "high": 280.72,
                "low": 190.82,
                "close": 226.94,
                "index": 1671326185500
            }
        ],
        "ticker" : "CRRPT",
        "period" : 1000
    },
    "msg": "subscribe"
}


```

### <span style="color:red">**--------------------------------------**}</span>

### - unsubscribe from ticker data
> - Client Requst to server

```json
{
    "msg" : "unsubscribe",
    "ticker" : "CRRPT",
    "period" : 1000
}

```

> - Server Responds with

```json
{
    "status": 1,
    "data": {
        "found": true
    },
    "msg": "unsubscribe"
}

```

### <span style="color:red">**--------------------------------------**}</span>

# Stock Config file 

### - Config For Data Generation


> `Ticker` must be unique otherwise it will be overwritten
> 
> if `min` or `max` are defined then wander will be the distance between these 2 points with 0 being in the middle
>
> if not defined, `wander` will affect the high's and low's of the seed over time
> 
> if `name` not provided `ticker` will be substitiuted for all instances of name
>
> <span style = "color:#a4bfeb;">**description --------------------------------------**</span>
> 
> `name` a name
> 
> `seed` a seed for random number generation
> 
> `wander` a number from -1 to 1 that indicates violitility of the price
> 
> `dateStart` null or a number in milliseconds or datetime indicating the first appearance on the index
> 
> `dateEnd` null or a number indicating the time this ticker was removed from the index,
> 
> `min` null or minimum value this stock can have
> 
> `max` null or maximum value this stock can have

```json
{...
  "Ticker" : {
  "name" : "WAS Corporation",
  "seed" : 3425,
  "wander" : 0.3,
  "dateStart" : "2022-12-09T20:03:39.830Z", 
  "dateEnd" : "2022-12-09T20:03:39.830Z",
  "min" : null,
  "max" : null,

  }
}
```
