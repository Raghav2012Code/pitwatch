/**
 * Every character the shipped PDF font subset can draw. Mirrors
 * src/assets/fonts/pdf/charset.txt, which the subsetter reads; pdfCharset.test.ts fails if the two
 * drift apart.
 */
export const PDF_CHARSET =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſΔΣσ–—‘’“”…'

/**
 * Text the embedded font can draw. Anything outside the subset becomes a visible '?', never
 * mojibake; decomposed accents are normalised first so 'e' + U+0301 prints as 'é'.
 */
export const pdfText = (text: string): string =>
  [...text.normalize('NFC')].map((c) => (PDF_CHARSET.includes(c) ? c : '?')).join('')
