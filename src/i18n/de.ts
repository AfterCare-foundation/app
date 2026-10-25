// German texts, keyed by the English text (see index.ts). Informal "du".
// Medical wording (the "Advice" block, the contact windows, the helpline) has to be
// checked by a native speaker with medical knowledge before release.

export const de: Record<string, string> = {
  // Tabs and general
  Home: "Start",
  "To-do": "Aufgaben",
  Info: "Info",
  Settings: "Einstellungen",
  Back: "Zurück",
  Cancel: "Abbrechen",
  Continue: "Weiter",
  Confirm: "Bestätigen",
  Delete: "Löschen",
  Remove: "Entfernen",
  Done: "Fertig",
  Save: "Speichern",
  Sent: "Gesendet",
  Dismiss: "Ausblenden",
  "Go back": "Zurück",
  "Try again": "Erneut versuchen",
  Contact: "Kontakt",
  Day: "Tag",
  Month: "Monat",
  Year: "Jahr",
  "{count} open": "{count} offen",
  "Something went wrong": "Etwas ist schiefgelaufen",
  "Preparing your device key…": "Gerätschlüssel wird vorbereitet…",
  "Private by design": "Datenschutz von Grund auf",

  // Infections
  Chlamydia: "Chlamydien",
  Gonorrhoea: "Gonorrhö",
  Syphilis: "Syphilis",
  "Mycoplasma genitalium": "Mycoplasma genitalium",
  Mycoplasma: "Mykoplasmen",
  HIV: "HIV",
  Mpox: "Mpox",
  "Hepatitis A": "Hepatitis A",
  "Hepatitis B": "Hepatitis B",
  "Hepatitis C": "Hepatitis C",
  Trichomoniasis: "Trichomoniasis",
  Shigella: "Shigellen",
  Scabies: "Krätze (Skabies)",
  "Pubic Lice": "Filzläuse",
  "Unspecified STI": "Nicht näher benannte STI",
  "an STI": "eine STI",

  // Home
  "Notifications are off. You will not be told if someone reports an exposure. Tap to turn them on.":
    "Benachrichtigungen sind aus. Du erfährst nicht, wenn jemand, mit dem du Kontakt hattest, eine STI meldet. Tippe hier, um sie einzuschalten.",
  "1 more alert waiting": "1 weitere Meldung wartet",
  "{count} more alerts waiting": "{count} weitere Meldungen warten",
  "No new alerts": "Keine neuen Meldungen",
  "Add the code from the card you took home to stay in the loop.":
    "Füge den Code von der Karte hinzu, die du mitgenommen hast, damit du auf dem Laufenden bleibst.",
  "You will see it here if someone you connected with reports an STI.":
    "Hier siehst du es, wenn jemand, mit dem du Kontakt hattest, eine STI meldet.",
  Add: "Hinzufügen",
  "Scan or enter a code": "Code scannen oder eingeben",
  Create: "Erstellen",
  "Show a code to scan": "Code zum Scannen zeigen",
  "Tested positive?": "Positiv getestet?",
  "Let the people you met know. They will not learn who you are.":
    "Gib den Menschen Bescheid, die du getroffen hast. Sie erfahren nicht, wer du bist.",
  "Notify partners": "Partner*innen benachrichtigen",
  "Notify Partners": "Partner*innen benachrichtigen",
  "Notify Partners|title": "Benachrichtigen",

  // Alert card
  "No action needed": "Nichts zu tun",
  "Time to get\ntested again": "Zeit für einen\nerneuten Test",
  "You may have been\nexposed to an STI": "Du hattest Kontakt mit\njemandem mit einer STI",
  "Someone you connected with has reported {sti}. Get tested when you can.":
    "Jemand, mit dem du Kontakt hattest, hat {sti} gemeldet. Lass dich testen, wenn du kannst.",
  "Someone you connected with has reported {sti}. You have already been tested, so {action}.":
    "Jemand, mit dem du Kontakt hattest, hat {sti} gemeldet. Du hast dich schon testen lassen, daher {action}.",
  "Someone you connected with has reported {sti}. The contact appears to be from before your positive test, so {action}.":
    "Jemand, mit dem du Kontakt hattest, hat {sti} gemeldet. Der Kontakt scheint vor deinem positiven Test gewesen zu sein, daher {action}.",
  "no further action is needed from you": "ist von dir nichts weiter zu tun",
  "This follows the alert about {sti}. One test soon after contact can miss an infection, so get tested again when you can, even if you already have.":
    "Das ist die Folgemeldung zu {sti}. Ein Test kurz nach dem Kontakt kann eine Infektion übersehen, lass dich deshalb noch einmal testen, wenn du kannst, auch wenn du es schon getan hast.",
  "Exposure does not mean infection.": "Kontakt heißt nicht gleich Infektion.",
  "Most exposures do not lead to HIV, and treatment today works very well.":
    "Die meisten Kontakte führen nicht zu HIV, und die Behandlung wirkt heute sehr gut.",
  "Last test: {date}": "Letzter Test: {date}",
  "Your test on {date} does not clear this alert. Get tested when you can.":
    "Dein Test vom {date} erledigt diese Meldung nicht. Lass dich testen, wenn du kannst.",
  "I've been tested recently": "Ich wurde kürzlich getestet",
  "You have a new message. Open the app to read it.": "Du hast eine neue Nachricht. Öffne die App, um sie zu lesen.",
  "Need a test?": "Du brauchst einen Test?",
  "AfterCare is not a medical service. To find a place to get tested, we recommend using the European Test Finder.":
    "AfterCare ist kein medizinischer Dienst. Um eine Teststelle zu finden, empfehlen wir den European Test Finder.",
  "Find a test": "Test finden",
  "Want to talk to someone?": "Möchtest du mit jemandem sprechen?",
  "The AIDS-Hilfe offers anonymous counselling by phone, and a chat for gay and bisexual men.":
    "Die Aidshilfe bietet anonyme Beratung am Telefon und einen Chat für schwule und bisexuelle Männer an.",
  "Gay Health Chat (online)": "Gay Health Chat (online)",
  "Germany: Mon–Fri 9–21, Sat and Sun 12–14. Berlin: daily 16–22. Chat: daily 17–20.":
    "Deutschlandweit: Mo–Fr 9–21, Sa und So 12–14 Uhr. Berlin: täglich 16–22 Uhr. Chat: täglich 17–20 Uhr.",
  "Germany: 0180 33 19411": "Deutschlandweit: 0180 33 19411",
  "Berlin: 030 19411": "Berlin: 030 19411",

  // Advice (REVIEW)
  "It may not be too late for a preventive vaccination. Contact a clinic or your doctor today.":
    "Eine vorbeugende Impfung ist vielleicht noch möglich. Wende dich noch heute an eine Klinik oder deine Ärztin bzw. deinen Arzt.",
  "It may not be too late for preventive treatment (PEP). Contact a clinic or emergency department today.":
    "Eine vorbeugende Behandlung (PEP) ist vielleicht noch möglich. Wende dich noch heute an eine Klinik oder eine Notaufnahme.",
  "A test now gives a reliable result.": "Ein Test liefert jetzt ein verlässliches Ergebnis.",
  "Get tested now. A reminder will show on the Home screen when it is time to test again.":
    "Lass dich jetzt testen. Auf dem Startbildschirm erscheint eine Erinnerung, wenn es Zeit für einen erneuten Test ist.",
  "Watch for new symptoms for {days} days. If any appear, see a doctor.":
    "Achte {days} Tage lang auf neue Symptome. Wenn welche auftreten, geh zu einer Ärztin oder einem Arzt.",
  "A clinic may treat you straight away, before your results.":
    "Eine Klinik behandelt dich unter Umständen sofort, noch vor den Ergebnissen.",
  "This is general guidance, not a diagnosis. Please see a doctor or a sexual health clinic.":
    "Das ist eine allgemeine Orientierung, keine Diagnose. Bitte wende dich an eine Ärztin, einen Arzt oder eine Beratungsstelle für sexuelle Gesundheit.",

  // To-do
  "Nothing to do. Alerts that need a test will wait here until you add a result.":
    "Nichts zu tun. Meldungen, die einen Test brauchen, warten hier, bis du ein Ergebnis einträgst.",
  "Still needs a test": "Braucht noch einen Test",
  "Retest: not tested yet": "Erneuter Test: noch nicht getestet",
  "Not tested yet": "Noch nicht getestet",
  "Reminder received {date}": "Erinnerung erhalten am {date}",
  "Last alert received {date}": "Letzte Meldung erhalten am {date}",
  "{sti}, not tested yet. Alert received {date}": "{sti}, noch nicht getestet. Meldung erhalten am {date}",
  "Remove from list?": "Von der Liste entfernen?",
  "Remove from list": "Von der Liste entfernen",
  "You will not get reminders to test for it. Do this only if you do not need a test.":
    "Du bekommst dann keine Erinnerungen mehr an den Test. Tu das nur, wenn du keinen Test brauchst.",
  "Keep it": "Behalten",

  // Test form
  "Your test": "Dein Test",
  "Did you get tested for {sti}?": "Hast du dich auf {sti} testen lassen?",
  "Yes, negative": "Ja, negativ",
  "Yes, positive": "Ja, positiv",
  "Saved: {date}. Saving replaces it.": "Gespeichert: {date}. Beim Speichern wird es ersetzt.",
  "When was the test?": "Wann war der Test?",
  "Is this right?": "Stimmt das?",
  "Positive {sti} test on {date}. Check the date: this alert is judged once, when you save, and a later change won't update it.":
    "Positiver {sti}-Test am {date}. Prüfe das Datum: Diese Meldung wird einmal beim Speichern bewertet, eine spätere Änderung wirkt sich nicht mehr aus.",
  "Negative {sti} test on {date}. Check the date: this alert is judged once, when you save, and a later change won't update it.":
    "Negativer {sti}-Test am {date}. Prüfe das Datum: Diese Meldung wird einmal beim Speichern bewertet, eine spätere Änderung wirkt sich nicht mehr aus.",
  "Yes, save": "Ja, speichern",
  "This stays on this phone. It is never sent to the server.":
    "Das bleibt auf diesem Handy. Es wird nie an den Server gesendet.",
  "Entered by mistake?": "Aus Versehen eingegeben?",
  'Settings has "Delete my test results".': 'In den Einstellungen gibt es „Meine Testergebnisse löschen“.',
  "That date is too early": "Dieses Datum ist zu früh",
  "A test counts for this alert only if it was taken on or after {date}. It stays on your list.":
    "Ein Test zählt für diese Meldung nur, wenn er am {date} oder später gemacht wurde. Sie bleibt auf deiner Liste.",
  "Test saved.": "Test gespeichert.",
  "Notify your contacts?": "Kontakte benachrichtigen?",
  "You can let the people you connected with know. They will not learn who you are.":
    "Du kannst den Menschen, mit denen du Kontakt hattest, Bescheid geben. Sie erfahren nicht, wer du bist.",
  "Not now": "Jetzt nicht",

  // Notify
  "What did you test positive for?": "Worauf wurdest du positiv getestet?",
  Less: "Weniger",
  "More…": "Mehr…",
  "When were you last {negative}?": "Wann warst du zuletzt {negative}?",
  negative: "negativ",
  "Date of your last negative test for {sti}, as saved on this phone. Change it if it is wrong.":
    "Datum deines letzten negativen Tests auf {sti}, wie auf diesem Handy gespeichert. Ändere es, wenn es nicht stimmt.",
  "Date of your last negative test for {sti}. Contacts since then are notified.":
    "Datum deines letzten negativen Tests auf {sti}. Kontakte seitdem werden benachrichtigt.",
  "Date of your last negative test, as saved on this phone. Change it if it is wrong.":
    "Datum deines letzten negativen Tests, wie auf diesem Handy gespeichert. Ändere es, wenn es nicht stimmt.",
  "Date of your last negative test. Contacts since then are notified.":
    "Datum deines letzten negativen Tests. Kontakte seitdem werden benachrichtigt.",
  "I'm not sure": "Ich bin nicht sicher",
  "Pick a date": "Datum wählen",
  "Pick the infection first": "Wähle zuerst die Infektion",
  "No contacts to notify": "Keine Kontakte zu benachrichtigen",
  "Contacts since {date}": "Kontakte seit {date}",
  "Contacts since {date} will be notified": "Kontakte seit {date} werden benachrichtigt",
  "Earlier contacts cannot have caught it from you, so they are left out.":
    "Frühere Kontakte können sich nicht bei dir angesteckt haben und werden daher ausgelassen.",
  "Your negative test is older than the usual {days} days, so that period is used.":
    "Dein negativer Test liegt länger zurück als die üblichen {days} Tage, daher wird dieser Zeitraum verwendet.",
  "Your negative test is older than we can reach {days} days, so that period is used.":
    "Dein negativer Test liegt länger zurück als die {days} Tage, die wir erreichen können, daher wird dieser Zeitraum verwendet.",
  "No test date, so we go back as far as we can reach: {days} days.":
    "Kein Testdatum, daher gehen wir so weit zurück, wie wir können: {days} Tage.",
  "No test date, so we go back the usual {days} days.": "Kein Testdatum, daher gehen wir die üblichen {days} Tage zurück.",
  "Based on: {source}.": "Grundlage: {source}.",
  "German and European STI guidelines": "Deutsche und europäische STI-Leitlinien",
  "German and European STI guidelines (approximate for this infection)":
    "Deutsche und europäische STI-Leitlinien (für diese Infektion nur ungefähre Angaben)",
  "Is this date right?": "Stimmt dieses Datum?",
  "Your last negative {sti} test: {date}.": "Dein letzter negativer {sti}-Test: {date}.",
  "Yes, continue": "Ja, weiter",
  "The infection is encrypted on this phone. The server cannot read it.":
    "Die Infektion wird auf diesem Handy verschlüsselt. Der Server kann sie nicht lesen.",
  "Send this notification?": "Diese Benachrichtigung senden?",
  "They will see": "Deine Kontakte sehen",
  'Inside the app: "{text}"': 'In der App: „{text}“',
  "This cannot be undone.": "Das lässt sich nicht rückgängig machen.",
  "Press and hold": "Gedrückt halten",
  "Keep holding…": "Weiter gedrückt halten…",
  "No contacts to notify.": "Keine Kontakte zu benachrichtigen.",
  "Nobody has scanned these cards yet, so your alert has not reached anyone. You can try again later.":
    "Bisher hat niemand diese Karten gescannt, deine Benachrichtigung hat also noch niemanden erreicht. Du kannst es später noch einmal versuchen.",
  "Your partners have been notified. Thanks for taking care of them.":
    "Deine Partner*innen wurden benachrichtigt. Danke, dass du dich um sie kümmerst.",
  "This code is already in use.": "Dieser Code wird bereits verwendet.",
  "This notification was already sent.": "Diese Benachrichtigung wurde schon gesendet.",
  "The server does not recognise this phone. Delete the app and install it again.":
    "Der Server erkennt dieses Handy nicht. Lösche die App und installiere sie neu.",
  "Your contacts could not be reached. Their connections may have expired.":
    "Deine Kontakte konnten nicht erreicht werden. Die Verbindungen sind möglicherweise abgelaufen.",
  "Refused. {detail}": "Abgelehnt. {detail}",

  // Scan and create
  "Add a code": "Code hinzufügen",
  Scan: "Scannen",
  Enter: "Eingeben",
  "Scan the code": "Code scannen",
  "Checking camera access…": "Kamerazugriff wird geprüft…",
  "Allow camera access to scan the QR on your card half.": "Erlaube den Kamerazugriff, um den QR-Code auf deiner Kartenhälfte zu scannen.",
  "Camera access is off. Enable it in Settings, or use Enter.":
    "Der Kamerazugriff ist aus. Schalte ihn in den Einstellungen ein oder nutze „Eingeben“.",
  "Allow camera": "Kamera erlauben",
  "Enter a link or code": "Link oder Code eingeben",
  "Link or code": "Link oder Code",
  "Paste a connect link or card code. Sauna reader codes are coming soon.":
    "Füge einen Verbindungslink oder Kartencode ein. Codes von Sauna-Lesegeräten kommen bald.",
  "Sauna codes are coming soon. For now, paste a connect link or card code.":
    "Sauna-Codes kommen bald. Füge vorerst einen Verbindungslink oder Kartencode ein.",
  Connect: "Verbinden",
  "Read a code. Registering…": "Code gelesen. Wird registriert…",
  "Only a hash of the card leaves this phone. The card itself is never sent.":
    "Nur ein Hash der Karte verlässt dieses Handy. Die Karte selbst wird nie gesendet.",
  "Create a code": "Code erstellen",
  "No code yet.": "Noch kein Code.",
  "Ask the other person to scan this code, or share the link with them. Once they connect, either of you can notify the other.":
    "Bitte die andere Person, diesen Code zu scannen, oder teile den Link mit ihr. Sobald sie sich verbindet, kann jede*r von euch die andere Person benachrichtigen.",
  "Share link": "Link teilen",
  'This code only means "these two phones met". It holds no name, number or location, and the server only sees a hash of it.':
    "Dieser Code bedeutet nur „diese beiden Handys haben sich getroffen“. Er enthält keinen Namen, keine Nummer und keinen Ort, und der Server sieht nur einen Hash davon.",
  "You already have this code.": "Du hast diesen Code schon.",
  "Code added.": "Code hinzugefügt.",
  "Card scanned. You can now safely discard it.": "Karte gescannt. Du kannst sie jetzt bedenkenlos wegwerfen.",
  "New alert: {sti}.": "Neue Meldung: {sti}.",
  "New alert. No card on this phone could open the details.":
    "Neue Meldung. Keine Karte auf diesem Handy konnte die Details öffnen.",

  // Settings
  "App icon": "App-Symbol",
  Playful: "Verspielt",
  Discreet: "Diskret",
  "{name} app icon": "App-Symbol „{name}“",
  "The icon could not be changed.": "Das Symbol konnte nicht geändert werden.",
  Language: "Sprache",
  Automatic: "Automatisch",
  Privacy: "Datenschutz",
  "Privacy policy": "Datenschutzerklärung",
  "Delete my test results": "Meine Testergebnisse löschen",
  "Delete my test results?": "Meine Testergebnisse löschen?",
  "Use this if you entered a test by mistake. New alerts will no longer take it into account. Alerts you already have stay as they are.":
    "Nutze das, wenn du einen Test aus Versehen eingegeben hast. Neue Meldungen berücksichtigen ihn dann nicht mehr. Bereits vorhandene Meldungen bleiben unverändert.",
  "Only your most recent result for each infection is kept, on this phone only. It decides how new alerts are treated.":
    "Pro Infektion wird nur dein neuestes Ergebnis gespeichert, nur auf diesem Handy. Es entscheidet, wie neue Meldungen behandelt werden.",
  "Delete my data": "Meine Daten löschen",
  "Delete my data?": "Meine Daten löschen?",
  "Deleting…": "Wird gelöscht…",
  "Removes everything from this phone and from the server.": "Entfernt alles von diesem Handy und vom Server.",
  "This removes your codes, contacts, alerts and test dates from this phone, and your device from the server. It cannot be undone.":
    "Dadurch werden deine Codes, Kontakte, Meldungen und Testdaten von diesem Handy und dein Gerät vom Server entfernt. Das lässt sich nicht rückgängig machen.",
  "Could not delete your data": "Deine Daten konnten nicht gelöscht werden",
  "Your data was deleted.": "Deine Daten wurden gelöscht.",
  "Your test results were deleted.": "Deine Testergebnisse wurden gelöscht.",
  "For your privacy, set a device passcode. Without one, anyone who picks up your phone can open AfterCare.":
    "Zum Schutz deiner Privatsphäre richte einen Gerätecode ein. Ohne ihn kann jede*r, der dein Handy in die Hand nimmt, AfterCare öffnen.",

  // Permissions and lock
  "Allow notifications": "Benachrichtigungen erlauben",
  "AfterCare can only warn you through notifications. Without them you will not find out that a contact told you about an infection. On the next screen, please choose Allow.":
    "AfterCare kann dich nur über Benachrichtigungen warnen. Ohne sie erfährst du nicht, dass ein Kontakt dich über eine Infektion informiert hat. Wähle auf dem nächsten Bildschirm bitte „Erlauben“.",
  "Unlock AfterCare": "AfterCare entsperren",

  // Info
  "How it works": "So funktioniert es",
  Club: "Club",
  Sauna: "Sauna",
  "Home|place": "Zuhause",
  "What stays private": "Was privat bleibt",
  Questions: "Fragen",
  "Learn more": "Mehr erfahren",
  "Take care with AfterCare 💜": "Pass auf dich auf – mit AfterCare 💜",
  "Add a code when you meet someone. If either of you tests positive later, one tap tells the other, anonymously.":
    "Füge einen Code hinzu, wenn du jemanden triffst. Wenn eine*r von euch später positiv getestet wird, informiert ein Tipp die andere Person, anonym.",
  Notified: "Benachrichtigt",
  "If either of you tests positive later, one tap tells the other. Anonymously, no name or identifying info exchanged.":
    "Wenn eine*r von euch später positiv getestet wird, informiert ein Tipp die andere Person. Anonym, ohne dass Name oder erkennbare Angaben ausgetauscht werden.",
  Treated: "Behandelt",
  "Get treated sooner, but only when advised by healthcare professionals. Early detection means less spread, and a healthier scene for everyone.":
    "Lass dich früher behandeln, aber nur auf Rat von medizinischem Fachpersonal. Früh erkannt heißt weniger Ansteckungen und eine gesündere Szene für alle.",
  Connected: "Verbunden",
  "Connecting shares nothing on its own, and nothing is ever sent unless you tap to send it.":
    "Das Verbinden teilt für sich genommen nichts, und es wird nie etwas gesendet, solange du nicht auf Senden tippst.",
  "Your halves match up once you've both scanned.": "Eure Hälften passen zusammen, sobald ihr beide gescannt habt.",
  "Your wristband pairing shows up in the app once you've both checked out.":
    "Die Kopplung eurer Armbänder erscheint in der App, sobald ihr beide ausgecheckt habt.",
  "Once the other person scans, the connection is established.": "Sobald die andere Person scannt, ist die Verbindung hergestellt.",
  Tear: "Zerreißen",
  "Split a card in half, like a cloakroom stub: one side each.": "Reiß eine Karte in der Mitte durch, wie einen Garderobenabschnitt: eine Hälfte für jede*n.",
  Keep: "Behalten",
  "Hang onto your half.": "Behalte deine Hälfte.",
  "Scan it in the app, whenever you're ready.": "Scanne sie in der App, wann immer du bereit bist.",
  Pair: "Koppeln",
  "Tap the reader with your wristband, then the other person taps theirs right after. A blinking light confirms you're connected.":
    "Halte dein Armband an das Lesegerät, danach die andere Person ihres. Ein blinkendes Licht zeigt, dass ihr verbunden seid.",
  "Check out": "Auschecken",
  "Tap your wristband on the reader on your way out, then enter the code it shows into the app.":
    "Halte dein Armband beim Hinausgehen an das Lesegerät und gib dann den angezeigten Code in der App ein.",
  Generate: "Erzeugen",
  "Generate your personal QR code in the app. No card needed.": "Erzeuge deinen persönlichen QR-Code in der App. Keine Karte nötig.",
  Show: "Zeigen",
  "Show your QR to the other person. They scan it with their phone camera.":
    "Zeige der anderen Person deinen QR-Code. Sie scannt ihn mit der Handykamera.",
  "On your phone": "Auf deinem Handy",
  "Your codes, contacts, alerts and test dates stay on this phone.": "Deine Codes, Kontakte, Meldungen und Testdaten bleiben auf diesem Handy.",
  "On our server": "Auf unserem Server",
  "No name, email or phone number. What a notification says is encrypted, and the server cannot read it.":
    "Kein Name, keine E-Mail, keine Telefonnummer. Was eine Benachrichtigung sagt, ist verschlüsselt, und der Server kann es nicht lesen.",
  "Gone after 6 months": "Nach 6 Monaten weg",
  "Old notifications are removed from the server automatically.": "Alte Benachrichtigungen werden automatisch vom Server entfernt.",
  "Yours to erase": "Du kannst alles löschen",
  "Delete everything at any time in Settings.": "Lösche jederzeit alles in den Einstellungen.",
  "What happens when someone scans my code?": "Was passiert, wenn jemand meinen Code scannt?",
  "You are connected. Nothing is shared, and nothing is sent unless you choose to send it.":
    "Ihr seid verbunden. Es wird nichts geteilt, und nichts wird gesendet, außer du entscheidest dich dafür.",
  "Will they know it is me?": "Wissen sie, dass ich es bin?",
  "No. A notification carries no name or contact details, and does not say who sent it.":
    "Nein. Eine Benachrichtigung enthält weder Namen noch Kontaktdaten und sagt nicht, wer sie gesendet hat.",
  "What does a notification say?": "Was steht in einer Benachrichtigung?",
  "That someone you were connected with tested positive, and for what if they chose to say. It is a prompt to get tested, not a diagnosis.":
    "Dass jemand, mit dem du verbunden warst, positiv getestet wurde, und worauf, wenn die Person es angeben wollte. Es ist eine Aufforderung, dich testen zu lassen, keine Diagnose.",
  "Why can I not see how many people I notified?": "Warum sehe ich nicht, wie viele Menschen ich benachrichtigt habe?",
  "So it never becomes a score. You only see that it was sent.": "Damit es nie zu einer Punktzahl wird. Du siehst nur, dass es gesendet wurde.",
  "What if I get a new phone?": "Was, wenn ich ein neues Handy bekomme?",
  "Your codes and contacts live only on your phone, never on a server. A new phone starts fresh.":
    "Deine Codes und Kontakte liegen nur auf deinem Handy, nie auf einem Server. Mit einem neuen Handy beginnst du von vorn.",
  "European Test Finder": "European Test Finder",
  "Contact us": "Kontakt aufnehmen",
  "AfterCare website": "AfterCare-Website",
  "Bacterial STIs reach record highs in Europe": "Bakterielle STI erreichen Rekordwerte in Europa",
  "ECDC press release, 21 May 2026": "Pressemitteilung des ECDC (englisch), 21. Mai 2026",
  "No mail app found. Write to {address}.": "Keine Mail-App gefunden. Schreibe an {address}.",
  "Could not open this link.": "Dieser Link konnte nicht geöffnet werden.",
};
