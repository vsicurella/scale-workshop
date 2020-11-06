/* global alert, MouseEvent, history, jQuery, JSZip */

import { model, synth } from './scaleworkshop.js'
import { isNil, findIndexClosestTo } from './helpers/general.js'
import { decimalToCents, mtof, midiNoteNumberToName, ftom, centsTableToMnlgBinary } from './helpers/converters.js'
import {
  LINE_TYPE,
  MNLG_OCTAVESIZE,
  MNLG_SCALESIZE,
  MNLG_HZREF,
  APP_TITLE,
  TUNING_MAX_SIZE,
  UNIX_NEWLINE,
  WINDOWS_NEWLINE,
  MNLG_MAXCENTS
} from './constants.js'
import { isEmpty } from './helpers/strings.js'
import { getLineType } from './helpers/types.js'
import { mathModulo } from './helpers/numbers.js'

function exportError() {
  const tuningTable = model.get('tuning table')
  // no tuning data to export
  if (isNil(tuningTable.freq[tuningTable.baseMidiNote])) {
    alert('No tuning data to export.')
    return true
  }
}

function saveFile(filename, contents, mimeType = 'application/octet-stream,') {
  const link = document.createElement('a')
  link.download = filename
  link.href = 'data:' + mimeType + encodeURIComponent(contents)
  console.log(link.href)
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })) // opens save dialog
}

function exportAnamarkTun() {
  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // TUN format spec:
  // http://www.mark-henning.de/files/am/Tuning_File_V2_Doc.pdf

  // assemble the .tun file contents
  let file = '; VAZ Plus/AnaMark softsynth tuning file' + newline
  file += '; ' + jQuery('#txt_name').val() + newline
  file += ';' + newline
  file += '; VAZ Plus section' + newline
  file += '[Tuning]' + newline

  for (let i = 0; i < TUNING_MAX_SIZE; i++) {
    file += 'note ' + i + '=' + parseInt(decimalToCents(parseFloat(tuningTable.freq[i]) / mtof(0))) + newline
  }

  file += newline + '; AnaMark section' + newline
  file += '[Scale Begin]' + newline
  file += 'Format= "AnaMark-TUN"' + newline
  file += 'FormatVersion= 200' + newline
  file += 'FormatSpecs= "http://www.mark-henning.de/eternity/tuningspecs.html"' + newline + newline
  file += '[Info]' + newline
  file += 'Name= "' + tuningTable.filename + '.tun"' + newline
  file += 'ID= "' + tuningTable.filename.replace(/ /g, '') + '.tun"' + newline // this line strips whitespace from filename, as per .tun spec
  file += 'Filename= "' + tuningTable.filename + '.tun"' + newline
  file += 'Description= "' + tuningTable.description + '"' + newline
  const date = new Date().toISOString().slice(0, 10)
  file += 'Date= "' + date + '"' + newline
  file += 'Editor= "' + APP_TITLE + '"' + newline + newline
  file += '[Exact Tuning]' + newline

  for (let i = 0; i < TUNING_MAX_SIZE; i++) {
    file += 'note ' + i + '= ' + decimalToCents(parseFloat(tuningTable.freq[i]) / mtof(0)).toFixed(6) + newline
  }

  file += newline + '[Functional Tuning]' + newline

  for (let i = 1; i < tuningTable.noteCount; i++) {
    if (i === tuningTable.noteCount - 1) {
      file +=
        'note ' + i + '="#>-' + i + ' % ' + decimalToCents(tuningTable.tuningData[i]).toFixed(6) + ' ~999"' + newline
    } else {
      file += 'note ' + i + '="#=0 % ' + decimalToCents(tuningTable.tuningData[i]).toFixed(6) + '"' + newline
    }
  }

  file += newline + '; Set reference key to absolute frequency (not scale note but midi key)' + newline
  file += 'note ' + tuningTable.baseMidiNote + '="! ' + tuningTable.baseFrequency.toFixed(6) + '"' + newline
  file += '[Scale End]' + newline

  saveFile(tuningTable.filename + '.tun', file)

  // success
  return true
}

function exportScalaScl() {
  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // assemble the .scl file contents
  let file = '! ' + tuningTable.filename + '.scl' + newline
  file += '! Created using ' + APP_TITLE + newline
  file += '!' + newline
  if (isEmpty(jQuery('#txt_name').val())) {
    file += 'Untitled tuning'
  } else {
    file += jQuery('#txt_name').val()
  }
  file += newline + ' '

  file += tuningTable.noteCount - 1 + newline
  file += '!' + newline

  for (let i = 1; i < tuningTable.noteCount; i++) {
    file += ' '

    // if the current interval is n-of-m edo or commadecimal linetype, output as cents instead
    if (
      getLineType(tuningTable.scale_data[i]) === LINE_TYPE.N_OF_EDO ||
      getLineType(tuningTable.scale_data[i]) === LINE_TYPE.DECIMAL
    ) {
      file += decimalToCents(tuningTable.tuningData[i]).toFixed(6)
    } else {
      file += tuningTable.scale_data[i]
    }

    file += newline
  }

  saveFile(tuningTable.filename + '.scl', file)

  // success
  return true
}

function exportScalaKbm() {
  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // assemble the .kbm file contents
  let file = '! Template for a keyboard mapping' + newline
  file += '!' + newline
  file += '! Size of map. The pattern repeats every so many keys:' + newline
  file += parseInt(tuningTable.noteCount - 1) + newline
  file += '! First MIDI note number to retune:' + newline
  file += '0' + newline
  file += '! Last MIDI note number to retune:' + newline
  file += '127' + newline
  file += '! Middle note where the first entry of the mapping is mapped to:' + newline
  file += parseInt(tuningTable.baseMidiNote) + newline
  file += '! Reference note for which frequency is given:' + newline
  file += parseInt(tuningTable.baseMidiNote) + newline
  file += '! Frequency to tune the above note to' + newline
  file += parseFloat(tuningTable.baseFrequency) + newline
  file += '! Scale degree to consider as formal octave (determines difference in pitch' + newline
  file += '! between adjacent mapping patterns):' + newline
  file += parseInt(tuningTable.noteCount - 1) + newline
  file += '! Mapping.' + newline
  file += '! The numbers represent scale degrees mapped to keys. The first entry is for' + newline
  file += '! the given middle note, the next for subsequent higher keys.' + newline
  file += '! For an unmapped key, put in an "x". At the end, unmapped keys may be left out.' + newline

  for (let i = 0; i < parseInt(tuningTable.noteCount - 1); i++) {
    file += i + newline
  }

  saveFile(tuningTable.filename + '.kbm', file)

  // success
  return true
}

function exportMaxMspColl() {
  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // assemble the coll file contents
  let file = '# Tuning file for Max/MSP coll objects. - Created using ' + APP_TITLE + newline
  file += '# ' + jQuery('#txt_name').val() + newline
  file += '#' + newline

  for (let i = 0; i < TUNING_MAX_SIZE; i++) {
    file += i + ', ' + tuningTable.freq[i].toFixed(7) + ';' + newline
  }

  saveFile(tuningTable.filename + '.txt', file)

  // success
  return true
}

function exportPdText() {
  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // assemble the text file contents
  let file = ''
  for (let i = 0; i < TUNING_MAX_SIZE; i++) {
    file += tuningTable.freq[i].toFixed(7) + ';' + newline
  }

  saveFile(tuningTable.filename + '.txt', file)

  // success
  return true
}

function exportKontaktScript() {
  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // assemble the kontakt script contents
  let file = '{**************************************' + newline
  file += jQuery('#txt_name').val() + newline
  file +=
    'MIDI note ' +
    tuningTable.baseMidiNote +
    ' (' +
    midiNoteNumberToName(tuningTable.baseMidiNote) +
    ') = ' +
    parseFloat(tuningTable.baseFrequency) +
    ' Hz' +
    newline
  file += 'Created using ' + APP_TITLE + newline
  file += '****************************************}' + newline + newline

  file += 'on init' + newline
  file += 'declare %keynum[' + TUNING_MAX_SIZE + ']' + newline
  file += 'declare %tune[' + TUNING_MAX_SIZE + ']' + newline
  file += 'declare $bend' + newline
  file += 'declare $key' + newline + newline

  for (let i = 0; i < TUNING_MAX_SIZE; i++) {
    const thisNote = ftom(tuningTable.freq[i])

    if (thisNote[0] < 0 || thisNote[0] >= TUNING_MAX_SIZE) {
      // if we're out of range of the default Kontakt tuning, leave note as default tuning
      file += '%keynum[' + i + '] := ' + i + newline
      file += '%tune[' + i + '] := 0' + newline
    } else {
      // success, we're in range of another note, so we'll change the tuning +/- 50c
      file += '%keynum[' + i + '] := ' + thisNote[0] + newline
      file += '%tune[' + i + '] := ' + parseInt(thisNote[1] * 1000) + newline
    }
  }

  file += 'end on' + newline + newline

  file += 'on note' + newline
  file += '$key := %keynum[$EVENT_NOTE]' + newline
  file += '$bend := %tune[$EVENT_NOTE]' + newline
  file += 'change_note ($EVENT_ID, $key)' + newline
  file += 'change_tune ($EVENT_ID, $bend, 0)' + newline
  file += 'end on' + newline

  saveFile(tuningTable.filename + '.txt', file)

  // success
  return true
}

function exportReferenceDeflemask() {
  // This exporter converts your tuning data into a readable format you can easily input manually into Deflemask.
  // For example if you have a note 50 cents below A4, you would input that into Deflemask as A-4 -- - E5 40
  // Deflemask manual: http://www.deflemask.com/manual.pdf

  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const newline = model.get('newline') === 'windows' ? WINDOWS_NEWLINE : UNIX_NEWLINE

  // assemble the text file contents
  let file =
    tuningTable.description +
    newline +
    'Reference for Deflemask note input - generated by ' +
    APP_TITLE +
    newline +
    newline
  for (let i = 0; i < TUNING_MAX_SIZE; i++) {
    // convert frequency into midi note number + cents offset
    let data = ftom(tuningTable.freq[i])

    // acceptable range is C#0 to B7 (MIDI notes 1-95). skip this note if it's out of range
    if (data[0] < 1 || data[0] > 95) continue

    // convert note number to note name
    data[0] = midiNoteNumberToName(data[0])
    data[0] = data[0].length === 2 ? data[0].slice(0, 1) + '-' + data[0].slice(1) : data[0]

    // convert cents offset to hex where -100c=00, 0c=80, 100c=FF
    data[1] = Math.round(128 + data[1] * 1.28)
      .toString(16)
      .toUpperCase()

    // add data to text file
    data = '[' + data[0] + ' xx] [xx E5 ' + data[1] + ']'
    file +=
      data +
      ' ..... ' +
      i +
      ': ' +
      tuningTable.freq[i].toFixed(2) +
      ' Hz / ' +
      tuningTable.cents[i].toFixed(2) +
      ' cents' +
      newline
  }

  saveFile(tuningTable.filename + '.txt', file)

  // success
  return true
}

function getMnlgtunTuningInfoXML(useScaleFormat, programmer, comment) {
  // Builds an XML file necessary for the .mnlgtun file format
  const rootName = useScaleFormat ? 'minilogue_TuneScaleInformation' : 'minilogue_TuneOctInformation'
  const xml = document.implementation.createDocument(null, rootName)

  const Programmer = xml.createElement('Programmer')
  Programmer.textContent = programmer
  xml.documentElement.appendChild(Programmer)

  const Comment = xml.createElement('Comment')
  Comment.textContent = comment
  xml.documentElement.appendChild(Comment)

  return xml
}

function getMnlgtunFileInfoXML(useScaleFormat, product = 'minilogue') {
  // Builds an XML file necessary for the .mnlgtun file format
  const rootName = 'KorgMSLibrarian_Data'
  const xml = document.implementation.createDocument(null, rootName)

  const Product = xml.createElement('Product')
  Product.textContent = product
  xml.documentElement.appendChild(Product)

  const Contents = xml.createElement('Contents')
  Contents.setAttribute('NumProgramData', 0)
  Contents.setAttribute('NumPresetInformation', 0)
  Contents.setAttribute('NumTuneScaleData', 1 * useScaleFormat)
  Contents.setAttribute('NumTuneOctData', 1 * !useScaleFormat)

  const [fileNameHeader, dataName, binName] = useScaleFormat
    ? ['TunS_000.TunS_', 'TuneScaleData', 'TuneScaleBinary']
    : ['TunO_000.TunO_', 'TuneOctData', 'TuneOctBinary']

  const TuneData = xml.createElement(dataName)

  const Information = xml.createElement('Information')
  Information.textContent = fileNameHeader + 'info'
  TuneData.appendChild(Information)

  const BinData = xml.createElement(binName)
  BinData.textContent = fileNameHeader + 'bin'
  TuneData.appendChild(BinData)

  Contents.appendChild(TuneData)
  xml.documentElement.appendChild(Contents)

  return xml
}

function exportMnlgtun(useScaleFormat) {
  // This exporter converts tuning data into a zip-compressed file for use with Korg's
  // 'logue Sound Librarian software, supporting their 'logue series of synthesizers.
  // While this exporter preserves accuracy as much as possible, the Sound Librarian software
  // unforunately truncates cent values to 1 cent precision. It's unknown whether the tuning accuracy
  // from this exporter is written to the synthesizer and used in the synthesis.

  if (exportError()) {
    return
  }

  const tuningTable = model.get('tuning table')
  const baseFreq = tuningTable.baseFrequency

  // find closest reference note to baseFreq
  const refNotes = Object.keys(MNLG_HZREF)
  const refValues = refNotes.map(n => MNLG_HZREF[n].freq)
  const bestIndex = findIndexClosestTo(baseFreq, refValues)
  const reference = MNLG_HZREF[refNotes[bestIndex]]

  // the index of the scale dump that's equal to the baseNote should have the following value
  const baseOffsetValue = reference.int + Math.round(decimalToCents(baseFreq / reference.freq))

  // build cents array for binary conversion
  let centsTable = tuningTable.cents.map(c => c + baseOffsetValue)

  if (useScaleFormat) {
    // ensure table length is exactly 128
    centsTable = centsTable.slice(0, MNLG_SCALESIZE)

    // this shouldn't happen unless something goes really wrong
    if (centsTable.length !== MNLG_SCALESIZE) {
      console.log('Somehow the mnlgtun table was less than 128 values, the end will be padded with 0s.')
      const padding = new Array(MNLG_SCALESIZE - centsTable.length).fill(0)
      centsTable = [...centsTable, ...padding]
    }
    
  } else {
    // normalize around root, truncate to 12 notes, and wrap flattened Cs
    let cNote = parseInt(tuningTable.baseMidiNote / MNLG_OCTAVESIZE) * MNLG_OCTAVESIZE
    centsTable = centsTable.slice(cNote, cNote + MNLG_OCTAVESIZE)
                           .map(cents => mathModulo(cents - MNLG_HZREF.c.int, MNLG_MAXCENTS))
  }

  // convert to binary
  const binaryData = centsTableToMnlgBinary(centsTable)

  // prepare files for zipping
  const tuningInfo = getMnlgtunTuningInfoXML(useScaleFormat, 'ScaleWorkshop', tuningTable.filename)
  const fileInfo = getMnlgtunFileInfoXML(useScaleFormat)
  const [fileNameHeader, fileType] = useScaleFormat ? ['TunS_000.TunS_', '.mnlgtuns'] : ['TunO_000.TunO_', '.mnlgtuno']

  // build zip
  const zip = new JSZip()
  zip.file(fileNameHeader + 'bin', binaryData)
  zip.file(fileNameHeader + 'info', tuningInfo.documentElement.outerHTML)
  zip.file('FileInformation.xml', fileInfo.documentElement.outerHTML)
  zip.generateAsync({ type: 'base64' }).then(
    base64 => {
      saveFile(tuningTable.filename + fileType, base64, 'application/zip;base64,')
    },
    err => alert(err)
  )

  // success
  return true
}

function getScaleUrl() {
  const url = new URL(window.location.href)
  const protocol = !isEmpty(url.protocol) ? url.protocol + '//' : 'http://'
  const host = url.host
  const pathname = !isEmpty(url.pathname) ? url.pathname : '/scaleworkshop/'
  // var domain = !isNil(window.location.href) ? window.location.href : 'http://sevish.com/scaleworkshop';
  const name = encodeURIComponent(jQuery('#txt_name').val())
  const data = encodeURIComponent(jQuery('#txt_tuning_data').val())
  const freq = encodeURIComponent(jQuery('#txt_base_frequency').val())
  const midi = encodeURIComponent(jQuery('#txt_base_midi_note').val())
  const vert = encodeURIComponent(synth.isomorphicMapping.vertical)
  const horiz = encodeURIComponent(synth.isomorphicMapping.horizontal)
  const colors = encodeURIComponent(jQuery('#input_key_colors').val())
  const waveform = encodeURIComponent(jQuery('#input_select_synth_waveform').val())
  const ampenv = encodeURIComponent(jQuery('#input_select_synth_amp_env').val())

  return (
    protocol +
    host +
    pathname +
    '?name=' +
    name +
    '&data=' +
    data +
    '&freq=' +
    freq +
    '&midi=' +
    midi +
    '&vert=' +
    vert +
    '&horiz=' +
    horiz +
    '&colors=' +
    colors +
    '&waveform=' +
    waveform +
    '&ampenv=' +
    ampenv
  )
}

function updatePageUrl(url = getScaleUrl()) {
  const tuningTable = model.get('tuning table')
  // update this change in the browser's Back/Forward navigation
  history.pushState({}, tuningTable.description, url)
}

function exportUrl() {
  let exportUrl = window.location.href

  if (exportError()) {
    exportUrl = 'http://sevish.com/scaleworkshop/'
  }

  // copy url in to url field
  jQuery('#input_share_url').val(exportUrl)
  console.log('exportUrl = ' + exportUrl)

  jQuery('#input_share_url').trigger('select')
  jQuery('#modal_share_url').dialog({
    modal: true,
    buttons: {
      'Copy URL': function() {
        jQuery('#input_share_url').trigger('select')
        document.execCommand('Copy')
        jQuery(this).dialog('close')
      }
    }
  })

  // url field clicked
  jQuery('#input_share_url').on('click', function(event) {
    jQuery(this).trigger('select')
  })

  // success
  return true
}

export {
  getScaleUrl,
  updatePageUrl,
  exportAnamarkTun,
  exportScalaScl,
  exportScalaKbm,
  exportMaxMspColl,
  exportPdText,
  exportKontaktScript,
  exportReferenceDeflemask,
  exportMnlgtun,
  exportUrl
}
