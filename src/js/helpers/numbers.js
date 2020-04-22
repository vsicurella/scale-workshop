/**
 * NUMBER OPERATIONS
 */

/* global alert */

import { PRIMES, LINE_TYPE } from '../constants.js'
import { getLineType } from './types.js'
import {
  lineToCents,
  lineToDecimal,
  decimalToCommadecimal,
  commadecimalToDecimal,
  ratioToDecimal
} from './converters.js'

const reciprocal = ratioStr =>
  ratioStr
    .split('/')
    .reverse()
    .join('/')

function mathModulo(number, modulo) {
  return ((number % modulo) + modulo) % modulo
}

// calculate the sum of the values in a given array given a stopping index
function sumOfArray(array) {
  return array.reduce((sum, x) => sum + x, 0)
}

function isPrime(number) {
  const sqrtnum = Math.floor(Math.sqrt(number))
  for (let i = 0; i < PRIMES.length; i++) {
    if (PRIMES[i] >= sqrtnum) {
      break
    }

    if (number % PRIMES[i] === 0) {
      return false
    }
  }
  return true
}

function prevPrime(number) {
  if (number < 2) {
    return 2
  }
  let i = 0
  while (i < PRIMES.length && PRIMES[i++] <= number);
  return PRIMES[i - 2]
}

function nextPrime(number) {
  if (number < 2) {
    return 2
  }
  let i = 0
  while (i < PRIMES.length && PRIMES[i++] <= number);
  return PRIMES[i - 1]
}

function closestPrime(number) {
  const thisPrime = isPrime(number)

  if (number < 2) {
    return 2
  } else if (thisPrime) {
    return number
  }

  const next = nextPrime(number)
  const previous = prevPrime(number)

  if (Math.abs(next - number) < Math.abs(previous - number)) {
    return next
  } else {
    return previous
  }
}

function getPrimeLimit(number) {
  const factors = getPrimeFactors(number)
  return PRIMES[factors.length - 1]
}

// Returns a single prime, the largest one between the numerator and denominator
function getPrimeLimitOfRatio(numerator, denominator) {
  return Math.max(getPrimeLimit(numerator), getPrimeLimit(denominator))
}

// Returns an array of: [ratioPrimeLimit, numeratorPrimeLimit, denominatorPrimeLimit]
function getPrimesOfRatio(numerator, denominator) {
  let nlim, dlim
  numerator === 1 ? (nlim = 1) : (nlim = getPrimeLimit(numerator))
  denominator === 1 ? (dlim = 1) : (dlim = getPrimeLimit(denominator))
  return [Math.max(nlim, dlim), nlim, dlim]
}

function getGCD(num1, num2) {
  if (num1 === 0 || num2 === 0) return num1 + num2
  else if (num1 === 1 || num2 === 1) return 1
  else if (num1 === num2) return num1

  return getGCD(num2, num1 % num2)
}

// TODO: GCD of an array

function getLCM(num1, num2) {
  if (num1 === 0 || num2 === 0) return 0

  const gcd = getGCD(num1, num2)
  return Math.trunc((Math.max(num1, num2) / gcd) * Math.min(num1, num2))
}

// TODO: faster algorithm for LCM of an array
function getLCMArray(array) {
  const primeCounters = []
  const primeFactors = []
  let f
  array.forEach(function(item) {
    f = getPrimeFactors(item)
    primeFactors.push(f)
  })

  let maxlength = 0
  primeFactors.forEach(function(item) {
    if (item.length > maxlength) {
      maxlength = item.length
    }
  })

  // find the min power of each primes in numbers' factorization
  for (let p = 0; p < maxlength; p++) {
    primeCounters.push(0)
    for (let n = 0; n < primeFactors.length; n++) {
      f = primeFactors[n]
      if (p < f.length) {
        if (primeCounters[p] < f[p]) {
          primeCounters[p] = f[p]
        }
      }
    }
  }

  let lcm = 1
  primeCounters.forEach(function(item, index) {
    lcm *= Math.pow(PRIMES[index], item)
  })

  return lcm
}

// returns array of the numerator and denominator of the reduced form of given ratio
function simplifyRatio(numerator, denominator) {
  const gcd = getGCD(numerator, denominator)
  return [numerator, denominator].map(x => x / gcd)
}

function simplifyRatioString(ratio) {
  const [n, d] = ratio.split('/').map(x => parseInt(x))
  return simplifyRatio(n, d).join('/')
}

function stackRatios(ratioStr1, ratioStr2) {
  const [n1, d1] = ratioStr1.split('/').map(x => parseInt(x))
  const [n2, d2] = ratioStr2.split('/').map(x => parseInt(x))
  return simplifyRatio(n1 * n2, d1 * d2).join('/')
}

function stackNOfEDOs(nOfEdo1Str, nOfEdo2Str) {
  const [deg1, edo1] = nOfEdo1Str.split('\\').map(x => parseInt(x))
  const [deg2, edo2] = nOfEdo2Str.split('\\').map(x => parseInt(x))
  const newEdo = getLCM(edo1, edo2)
  const newDegree = (newEdo / edo1) * deg1 + (newEdo / edo2) * deg2
  return simplifyRatio(newDegree, newEdo).join('\\')
}

function stackLines(line1, line2) {
  const line1Type = getLineType(line1)
  const line2Type = getLineType(line2)

  // If both are ratios, preserve ratio notation
  if (line1Type === LINE_TYPE.RATIO && line2Type === LINE_TYPE.RATIO) {
    return stackRatios(line1, line2)

    // If both are N of EDOs, preserve N of EDO notation
  } else if (line1Type === LINE_TYPE.N_OF_EDO && line2Type === LINE_TYPE.N_OF_EDO) {
    return stackNOfEDOs(line1, line2)

    // If the first line is a decimal type, keep decimals
  } else if (line1Type === LINE_TYPE.DECIMAL) {
    return decimalToCommadecimal(lineToDecimal(line1) * lineToDecimal(line2))

    // All other cases convert to cents
  } else {
    const value = lineToCents(line1) + lineToCents(line2)
    return value.toFixed(6)
  }
}

// stacks an interval on itself. for ratios and decimals, it is a power function
function stackSelf(line, numStacks) {
  const lineType = getLineType(line)
  const wholeExp = numStacks === Math.trunc(numStacks)

  if (lineType === LINE_TYPE.DECIMAL) {
    return decimalToCommadecimal(Math.pow(lineToDecimal(line), numStacks))
  } else if (wholeExp && lineType === LINE_TYPE.RATIO) {
    let ratio = '1/1'
    if (numStacks > 0) ratio = line.split('/')
    else if (numStacks < 0) ratio = line.split('/').reverse()
    else return ratio
    return ratio.map(x => parseInt(Math.pow(x, Math.abs(numStacks)))).join('/')
  } else if (wholeExp && lineType === LINE_TYPE.N_OF_EDO) {
    const [deg, edo] = line.split('\\')
    return deg * numStacks + '\\' + edo
  } else {
    const value = lineToCents(line) * (1 + numStacks)
    return value.toFixed(6)
  }
}

function moduloLine(line, modLine) {
  const numType = getLineType(line)
  const modType = getLineType(modLine)

  if (numType === LINE_TYPE.RATIO && modType === LINE_TYPE.RATIO) {
    const periods = Math.floor([line, modLine].map(ratioToDecimal).reduce((a, b) => Math.log(a) / Math.log(b)))
    return stackRatios(line, stackSelf(modLine, -periods))
  } else if (numType === LINE_TYPE.N_OF_EDO && modType === LINE_TYPE.N_OF_EDO) {
    const [numDeg, numEdo] = line.split('\\').map(x => parseInt(x))
    const [modDeg, modEdo] = modLine.slip('\\').map(x => parseInt(x))
    const lcmEdo = getLCM(numEdo, modEdo)
    return (((numDeg * lcmEdo) / numEdo) % ((modDeg * lcmEdo) / modEdo)) + '\\' + lcmEdo
  } else if (numType === LINE_TYPE.DECIMAL) {
    const num = commadecimalToDecimal(line)
    const mod = lineToDecimal(modLine)
    const periods = Math.floor(num / mod)
    return decimalToCommadecimal(num / Math.pow(mod, -periods))
  } else if (numType === LINE_TYPE.N_OF_EDO && lineToDecimal(modLine) === 2) {
    const [num, mod] = line.split('\\').map(x => parseInt(x))
    return parseInt(mathModulo(num, mod)) + '\\' + mod
  } else {
    return [line, modLine]
      .map(lineToCents)
      .reduce(mathModulo)
      .toFixed(6)
  }
}

// TODO: functional improvements
function invertChord(chordString) {
  if (!/^(\d+:)+\d+$/.test(chordString)) {
    alert('Warning: invalid chord ' + chordString)
    return false
  }

  let intervals = chordString.split(':').map(x => parseInt(x))
  const steps = []
  intervals.forEach(function(item, index, array) {
    if (index > 0) {
      steps.push([item, array[index - 1]])
    }
  })

  steps.reverse()
  intervals = [[1, 1]]

  const denominators = []
  steps.forEach(function(item, index) {
    const reducedInterval = simplifyRatio(item[0] * intervals[index][0], item[1] * intervals[index][1])
    intervals.push(reducedInterval)
    denominators.push(reducedInterval[1])
  })

  const lcm = getLCMArray(denominators)

  const newChordString = []
  intervals.forEach(function(x) {
    newChordString.push((x[0] * lcm) / x[1])
  })

  return newChordString.join(':')
}

// returns an array representing the prime factorization
// indicies are the 'nth' prime, the value is the powers of each prime
function getPrimeFactors(number) {
  const num = Math.floor(number)
  if (num === 1) {
    return 1
  }
  const factorsOut = []
  let n = num
  let q = num
  let loop

  for (let i = 0; i < PRIMES.length; i++) {
    if (PRIMES[i] > n) {
      break
    }

    factorsOut.push(0)

    if (PRIMES[i] === n) {
      factorsOut[i]++
      break
    }

    loop = true

    while (loop) {
      q = n / PRIMES[i]

      if (q === Math.floor(q)) {
        n = q
        factorsOut[i]++
        continue
      }
      loop = false
    }
  }

  return factorsOut
}

const clamp = (min, max, value) => {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

export {
  reciprocal,
  mathModulo,
  sumOfArray,
  isPrime,
  nextPrime,
  prevPrime,
  closestPrime,
  getPrimeLimit,
  getPrimeLimitOfRatio,
  getPrimesOfRatio,
  getGCD,
  getLCM,
  getLCMArray,
  simplifyRatio,
  simplifyRatioString,
  stackRatios,
  stackNOfEDOs,
  stackLines,
  stackSelf,
  moduloLine,
  invertChord,
  getPrimeFactors,
  clamp
}
