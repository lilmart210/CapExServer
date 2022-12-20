//https://towardsdatascience.com/building-a-pseudorandom-number-generator-9bc37d3a87d5
//https://www.npmjs.com/package/simplex-noise
const {createNoise4D} = require("simplex-noise");
const alea = require("alea");
const noise = createNoise4D(alea('where the problem at?'));

/**
 * Note The parameter for gen is x y z h
 * These stand for day hour minute second
 *
 * with seconds being the smallest unit of measurement
 * bar data for all of these are created by collapsing ms data into small bits and then sending them out
 *
 *
 * All data will be start point inclusive and end point exclusive
 * so on a 1 minute chart, the start value will be at index X where X mod 60 has no remainder
 * the ending value will be where the X mod 60 is equal to 60 - 1.
 * 60 is the length of second bars in a minute.
 */


/**
 *
 * @param val a number [from datetime in ms]
 * @param min smallest possible value
 * @param max biggest possible value
 * @returns a number between max and min inclusive
 */
function generate(val : number,min : number,max : number) {
  const d = new Date(val);

  const x = d.getHours() / 24;
  const y = d.getMinutes() / 60;
  const z = d.getSeconds() / 60
  const h = (val % 1000) / 1000;

  return (min + (max - min) / 2) + (max - min) / 2 * noise(x,y,z,h);
}

//shrinks a period of data according to a period
//this turns a stream of val index pairs into a stream of data
//this won't work on 1 second streams
class aggregate{
  first : boolean = true;
  period : number;
  state : {[name : string] : any};

  constructor(period : number){
    this.state = {};
    this.reset();
    this.first = true;
    this.period = period;

    this.reset = this.reset.bind(this);
    this.push = this.push.bind(this);
  }

  push(val : number,index : number){
    const hitPeriod = index % this.period == 0;
    let bar : any = null;
    if(hitPeriod){
      bar = this.state;
      bar.index = (bar.index + index) / 2;
      this.reset();
    }

    if(this.state.open == null){
      this.state.open = val;
      this.state.high = val;
      this.state.low = val;
      this.state.close = val;
      this.state.index = index;
    }

    this.state.high = Math.max(val,this.state.high);
    this.state.low = Math.min(val,this.state.low);
    this.state.close = val;

    if(hitPeriod && !this.first){
      return bar
    }else {
      this.first = false;
      return null;
    }
  }

  reset(){
    this.state = {
      open : null,
      high : null,
      low : null,
      close : null,
      index : null
    }
  }
}

/**
 * @param {*} seed
 * @param {*} max
 * @param {*} min
 * @returns function (x,y,z,h) => a number between min and max
 */
export function MakeGenerator(seed : number | string,max : number,min : number){
  /**
   * @param x number -1 to 1 | hours
   * @param y number -1 to 1 | minutes
   * @param z number -1 to 1 | seconds
   * @param h number -1 to 1 | ms
   */
  function gen(x : number,y : number ,z : number,h : number){
    const res = gen.noise(x,y,z,h)


    return (gen.min + (gen.max - gen.min) / 2) + (gen.max - gen.min) / 2 * noise(x,y,z,h);
  }

  //from = start number
  //to = end number
  //step = a number to skip by.
  //smallest step is 1 / 1000
  gen.collapse = function(from : number,to : number,step : number){
    //make sure number gets the entire bar for the step
    let start = from % step != 0 ? from - from % step : from ;
    let end = to % step != 0 ? to + (step - to % step) : to;
    const agg = new aggregate(step);
    const travel = 10;
    const seq : Array<{[name : string] : any}> = [];

    const tb = (str : any)=>{return new TextEncoder().encode(JSON.stringify(str)).length;}
    let bufsize = tb(seq);

    //build bars
    for(let i = start; i < end; i += travel){
      const d = new Date(i);
      const x = d.getHours() / 24;
      const y = d.getMinutes() / 60;
      const z = d.getSeconds() / 60;
      const h = d.getMilliseconds() / 1000;
      //rounds to 2 decimals
      const res = Math.trunc(gen(x,y,z,h) * 100) / 100;
      const aggres = agg.push(res,i);
      //buffer size protection
      const addon = tb(aggres);
      if(gen.limit && bufsize + addon > gen.limit){
        break;
      }
      bufsize += addon;
      //push back value
      if(aggres) seq.push(aggres);
    }

    return seq;
  }

  gen.setSeed = function(seed : string | number){
    gen.seed = new alea(seed);
    gen.noise = createNoise4D(gen.seed);
  }
  gen.setMinMax = function(min : number,max : number){
    gen.min = min;
    gen.max = max;
  }
  gen.setLimit = function(limit : number){
    gen.limit = limit;
  }

  gen.limit = 0;
  gen.seed = new alea(seed);
  gen.noise = createNoise4D(gen.seed);
  gen.min = min;
  gen.max = max;

  return gen;
}
