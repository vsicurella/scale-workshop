/* global location, jQuery, localStorage, navigator */

import { LOCALSTORAGE_PREFIX } from '../constants.js'
import { parseTuningData } from '../scaleworkshop.js'
import { isEmpty } from './strings.js'

function setScaleName(title) {
  jQuery('#txt_name').val(title)
}

function closePopup(id) {
  jQuery(id).dialog('close')
}

function setTuningData(tuning) {
  jQuery('#txt_tuning_data').val(tuning)
}

function isTuningDataAvailable() {
  trimSelf('#txt_tuning_data')
  if (isEmpty(jQuery('#txt_tuning_data').val())) {
    return false
  }
  return true
}

const isNil = x => typeof x === 'undefined' || x === null

const isFunction = x => typeof x === 'function'

function getCoordsFromKey(tdOfKeyboard) {
  try {
    return JSON.parse(tdOfKeyboard.getAttribute('data-coord'))
  } catch (e) {
    return []
  }
}

const roundToNDecimals = (decimals, number) => {
  return Math.round(number * 10 ** decimals) / 10 ** decimals
}

// Runs the given function with the supplied value, then returns the value
// This is a great tool for injecting debugging in the middle of expressions
// Note: fn does not need to return the value, tap will handle that
//
// example 1: const result = toString(tap(function(result){ console.log(result) }, 3 * 5))
// example 2: const result = toString(tap(result => console.log(result), 3 * 5))
// example 3: const result = toString(tap(console.log, 3 * 5))
//
// the above examples are equal to:
//   let result = 3 * 5
//   console.log(result)
//   result = toString(result)
function tap(fn, value) {
  fn(value)
  return value
}

function getSearchParamOr(valueIfMissing, key, url) {
  return url.searchParams.has(key) ? url.searchParams.get(key) : valueIfMissing
}

function getSearchParamAsNumberOr(valueIfMissingOrNan, key, url) {
  return url.searchParams.has(key) && !isNaN(url.searchParams.get(key))
    ? parseFloat(url.searchParams.get(key))
    : valueIfMissingOrNan
}

function trimSelf(el) {
  jQuery(el).val(function(idx, val) {
    return val.trim()
  })
}

function openDialog(el, onOK) {
  jQuery(el).dialog({
    modal: true,
    buttons: {
      OK: onOK,
      Cancel: function() {
        jQuery(this).dialog('close')
      }
    }
  })
}

function openDialogWithPreview(el, onPreview, onOk) {
  const confirmPreview =
    onOk ||
    function() {
      jQuery('#txt_tuning_data').val(onPreview())
      parseTuningData()
      jQuery(this).dialog('close')
    }

  const element = jQuery(el)

  const modalContainer = jQuery('<div>', {
    id: 'modal_dialog_with_preview',
    class: 'modal container'
  })

  const rowContainer = jQuery('<div>', {
    id: 'modal_dialog_row',
    class: 'row'
  })
  modalContainer.append(rowContainer)

  const formContainer = jQuery('<div>', {
    id: 'modal_controls',
    class: 'col'
  })
  formContainer.append(element)

  const previewContainer = jQuery('<div>', {
    id: 'preview_container',
    class: 'col'
  })

  const previewArea = jQuery('<textarea>', {
    id: 'previewText',
    class: 'form-control',
    readonly: 'readonly',
    rows: 12
  })
  previewContainer.append(previewArea)

  rowContainer.append(formContainer).append(previewContainer)

  modalContainer.modal({
    modal: true,
    width: 600,
    buttons: {
      Preview: function() {
        previewArea.val(onPreview())
      },
      OK: confirmPreview,
      Cancel: function() {
        jQuery(this).dialog('close')
      }
    }
    // open: previewArea.val(onPreview())
  })
}

// redirect all traffic to https, if not there already
// source: https://stackoverflow.com/a/4723302/1806628
function redirectToHTTPS() {
  if (location.protocol !== 'https:') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length)
  }
}

// source: https://stackoverflow.com/a/16427747/1806628
const isLocalStorageAvailable = () => {
  const test = 'test'
  try {
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

// source: https://stackoverflow.com/a/9514476/1806628
const isRunningOnWindows = () => {
  return navigator.userAgent.includes('Windows')
}

function getNewlineSettingsFromBrowser() {
  let value = isRunningOnWindows() ? 'windows' : 'unix'

  if (isLocalStorageAvailable()) {
    const valueInLocalStorage = localStorage.getItem(`${LOCALSTORAGE_PREFIX}newline`)
    if (valueInLocalStorage === 'windows' || valueInLocalStorage === 'unix') {
      value = valueInLocalStorage
    } else {
      // newline settings in localStorage has invalid value, this is the time to do some cleanup
      localStorage.removeItem(`${LOCALSTORAGE_PREFIX}newline`)
    }
  }

  return value
}

// source: https://stackoverflow.com/a/14810722/1806628
// objectMap(val => val * 2, {a: 10, b: 20}) --> {a: 20, b: 40}
const objectMap = (fn, obj) => {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]))
}

export {
  setScaleName,
  closePopup,
  setTuningData,
  isTuningDataAvailable,
  isFunction,
  isNil,
  getCoordsFromKey,
  roundToNDecimals,
  tap,
  getSearchParamOr,
  getSearchParamAsNumberOr,
  trimSelf,
  openDialog,
  openDialogWithPreview,
  redirectToHTTPS,
  isLocalStorageAvailable,
  isRunningOnWindows,
  getNewlineSettingsFromBrowser,
  objectMap
}
