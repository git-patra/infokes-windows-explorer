import postgres from 'postgres'

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://explorer:explorer@localhost:5432/explorer'
const sql = postgres(connectionString)

interface FolderRow {
  id: bigint
  path: string
  depth: number
}

// Realistic sub-folder names per root
const rootSubfolders: Record<string, string[][]> = {
  Documents: [
    ['Work', 'Projects', 'Reports', 'Invoices', 'Contracts'],
    ['Personal', 'Finance', 'Medical', 'Legal'],
    ['School', 'Notes', 'Assignments', 'Research'],
    ['Archive', '2022', '2023', '2024'],
    ['Templates', 'Letters', 'Forms'],
  ],
  Downloads: [
    ['Software', 'Installers', 'Updates', 'Drivers'],
    ['Media', 'Movies', 'Music', 'Podcasts'],
    ['Books', 'PDFs', 'Ebooks', 'Magazines'],
    ['Torrents', 'Completed', 'Incomplete'],
    ['Temp', 'Misc', 'Unsorted'],
  ],
  Pictures: [
    ['Photos', '2022', '2023', '2024'],
    ['Vacation', 'Europe', 'Asia', 'Americas'],
    ['Family', 'Events', 'Birthdays', 'Holidays'],
    ['Wallpapers', 'Nature', 'Abstract', 'Cities'],
    ['Screenshots', 'Desktop', 'Mobile'],
  ],
  Music: [
    ['Rock', 'Classic Rock', 'Alternative', 'Indie'],
    ['Pop', 'Charts', 'Throwbacks', 'Electronic'],
    ['Jazz', 'Smooth Jazz', 'Blues', 'Soul'],
    ['Playlists', 'Workout', 'Chill', 'Focus'],
    ['Podcasts', 'Tech', 'Science', 'Comedy'],
  ],
  Videos: [
    ['Movies', 'Action', 'Drama', 'Comedy'],
    ['Series', 'Season 1', 'Season 2', 'Season 3'],
    ['Tutorials', 'Coding', 'Design', 'DevOps'],
    ['Recordings', 'Meetings', 'Lectures', 'Demos'],
    ['Home Videos', '2022', '2023', '2024'],
  ],
}

// Sub-sub-folder names per level-1 folder
const subSubfolderSets: Record<string, string[][]> = {
  Work: [['Q1', 'Q2', 'Q3'], ['Budget', 'Expenses'], ['Drafts', 'Final']],
  Projects: [['Alpha', 'Beta', 'Gamma'], ['Active', 'Archived'], ['Specs', 'Design']],
  Reports: [['Monthly', 'Quarterly'], ['Sales', 'HR'], ['Finance', 'Operations']],
  Invoices: [['Paid', 'Pending'], ['2023', '2024'], ['Clients', 'Vendors']],
  Contracts: [['Active', 'Expired'], ['Suppliers', 'Customers'], ['NDA', 'SLA']],
  Personal: [['Goals', 'Diary'], ['Wishlist', 'Bucket List'], ['Ideas', 'Thoughts']],
  Finance: [['Banking', 'Savings'], ['Tax', 'Returns'], ['Investments', 'Stocks']],
  Medical: [['Records', 'Prescriptions'], ['Insurance', 'Claims'], ['Lab Results', 'Imaging']],
  Legal: [['Agreements', 'Disputes'], ['Property', 'Vehicle'], ['Identity', 'Passport']],
  School: [['Math', 'Science'], ['History', 'Literature'], ['Electives', 'PE']],
  Notes: [['Lecture Notes', 'Study Guides'], ['Summaries', 'Flashcards'], ['Practice', 'Exams']],
  Assignments: [['Due', 'Submitted'], ['Graded', 'Pending'], ['Group', 'Individual']],
  Research: [['Papers', 'Journals'], ['Data', 'Analysis'], ['References', 'Citations']],
  Archive: [['Old Files', 'Backups'], ['Deleted', 'Recovered'], ['Misc', 'Unsorted']],
  '2022': [['Jan-Mar', 'Apr-Jun'], ['Jul-Sep', 'Oct-Dec'], ['Annual', 'Summary']],
  '2023': [['Jan-Mar', 'Apr-Jun'], ['Jul-Sep', 'Oct-Dec'], ['Annual', 'Summary']],
  '2024': [['Jan-Mar', 'Apr-Jun'], ['Jul-Sep', 'Oct-Dec'], ['Annual', 'Summary']],
  Templates: [['Business', 'Personal'], ['Legal', 'Finance'], ['Creative', 'Academic']],
  Letters: [['Formal', 'Informal'], ['Cover Letters', 'Complaints'], ['Thank You', 'Requests']],
  Forms: [['Tax Forms', 'Medical Forms'], ['Government', 'Bank'], ['Insurance', 'HR']],
  Software: [['Windows', 'macOS'], ['Linux', 'Android'], ['Tools', 'Games']],
  Installers: [['Office', 'Creative'], ['Utilities', 'Security'], ['Dev Tools', 'Browsers']],
  Updates: [['OS Updates', 'App Updates'], ['Firmware', 'Drivers'], ['Patches', 'Hotfixes']],
  Drivers: [['GPU', 'Audio'], ['Network', 'Bluetooth'], ['Printer', 'USB']],
  Media: [['HD', 'SD'], ['Streaming', 'Downloaded'], ['Subtitles', 'Metadata']],
  Movies: [['Action', 'Thriller'], ['Comedy', 'Horror'], ['Sci-Fi', 'Documentary']],
  Music: [['Albums', 'Singles'], ['Compilations', 'Soundtracks'], ['Live', 'Remixes']],
  Podcasts: [['Tech Talk', 'Science'], ['History', 'True Crime'], ['Business', 'Health']],
  Books: [['Fiction', 'Non-Fiction'], ['Self-Help', 'Biographies'], ['Tech', 'Science']],
  PDFs: [['Manuals', 'Guides'], ['Reports', 'Articles'], ['Forms', 'Templates']],
  Ebooks: [['Fantasy', 'Sci-Fi'], ['Mystery', 'Romance'], ['History', 'Politics']],
  Magazines: [['Technology', 'Science'], ['Business', 'Health'], ['Travel', 'Food']],
  Torrents: [['Active', 'Paused'], ['Seeding', 'Error'], ['Imported', 'External']],
  Completed: [['Movies', 'Series'], ['Games', 'Software'], ['Music', 'Books']],
  Incomplete: [['Paused', 'Stuck'], ['Queued', 'Waiting'], ['Error', 'Retry']],
  Temp: [['Cache', 'Logs'], ['Scratch', 'Trash'], ['Incoming', 'Outgoing']],
  Misc: [['Random', 'Unsorted'], ['Mixed', 'Various'], ['Other', 'Extra']],
  Unsorted: [['New', 'Old'], ['Unknown', 'Unnamed'], ['Check', 'Review']],
  Photos: [['Raw', 'Edited'], ['Portraits', 'Landscapes'], ['Events', 'Candid']],
  Vacation: [['Beach', 'Mountains'], ['City', 'Countryside'], ['Adventures', 'Food']],
  Europe: [['France', 'Italy'], ['Spain', 'Germany'], ['UK', 'Netherlands']],
  Asia: [['Japan', 'Thailand'], ['Vietnam', 'Korea'], ['China', 'India']],
  Americas: [['USA', 'Canada'], ['Mexico', 'Brazil'], ['Argentina', 'Colombia']],
  Family: [['Kids', 'Parents'], ['Grandparents', 'Siblings'], ['Reunions', 'Gatherings']],
  Events: [['Weddings', 'Graduations'], ['Birthdays', 'Anniversaries'], ['Parties', 'Trips']],
  Birthdays: [['2022', '2023'], ['2024', 'Upcoming'], ['Cards', 'Gifts']],
  Holidays: [['Christmas', 'Easter'], ['Halloween', 'Thanksgiving'], ['New Year', 'Summer']],
  Wallpapers: [['4K', 'HD'], ['Minimal', 'Abstract'], ['Seasonal', 'Custom']],
  Nature: [['Forests', 'Oceans'], ['Mountains', 'Deserts'], ['Wildlife', 'Flowers']],
  Abstract: [['Geometric', 'Fluid'], ['Dark', 'Light'], ['Neon', 'Pastel']],
  Cities: [['Night', 'Day'], ['Skylines', 'Streets'], ['Buildings', 'Parks']],
  Screenshots: [['Apps', 'Games'], ['Errors', 'Bugs'], ['References', 'Inspiration']],
  Desktop: [['2022', '2023'], ['2024', 'Current'], ['Work', 'Personal']],
  Mobile: [['iPhone', 'Android'], ['Apps', 'Games'], ['Social', 'Messages']],
  Rock: [['Albums', 'Singles'], ['Live', 'Acoustic'], ['80s', '90s']],
  'Classic Rock': [['Beatles', 'Led Zeppelin'], ['Pink Floyd', 'Rolling Stones'], ['Deep Purple', 'AC/DC']],
  Alternative: [['Nirvana', 'Pearl Jam'], ['Radiohead', 'Pixies'], ['The Strokes', 'Arctic Monkeys']],
  Indie: [['Tame Impala', 'Fleet Foxes'], ['Bon Iver', 'Iron & Wine'], ['The National', 'Wilco']],
  Pop: [['2000s', '2010s'], ['2020s', 'Current'], ['International', 'Remixes']],
  Charts: [['Hot 100', 'UK Charts'], ['Global', 'Local'], ['Weekly', 'Monthly']],
  Throwbacks: [['90s', '00s'], ['80s', '70s'], ['Classics', 'Forgotten']],
  Electronic: [['House', 'Techno'], ['Ambient', 'Trance'], ['DnB', 'Dubstep']],
  Jazz: [['Classic', 'Modern'], ['Bebop', 'Cool Jazz'], ['Fusion', 'Free Jazz']],
  'Smooth Jazz': [['Kenny G', 'Boney James'], ['Acoustic', 'Electric'], ['Albums', 'Collections']],
  Blues: [['Chicago', 'Delta'], ['Electric', 'Acoustic'], ['Classic', 'Modern']],
  Soul: [['Motown', 'Stax'], ['Neo-Soul', 'R&B'], ['70s', '80s']],
  Playlists: [['Morning', 'Night'], ['Running', 'Yoga'], ['Party', 'Relax']],
  Workout: [['Cardio', 'Weights'], ['HIIT', 'Stretching'], ['Warm Up', 'Cool Down']],
  Chill: [['Lo-fi', 'Acoustic'], ['Rainy Day', 'Coffee Shop'], ['Evening', 'Night']],
  Focus: [['Deep Work', 'Study'], ['Coding', 'Writing'], ['No Lyrics', 'Instrumental']],
  Tech: [['Programming', 'Hardware'], ['Security', 'Cloud'], ['AI', 'Web']],
  Science: [['Physics', 'Biology'], ['Chemistry', 'Astronomy'], ['Environment', 'Math']],
  Comedy: [['Stand Up', 'Sketches'], ['Improv', 'Roasts'], ['Satirical', 'Absurd']],
  Action: [['Hollywood', 'Indie'], ['Superhero', 'Spy'], ['War', 'Heist']],
  Drama: [['Historical', 'Contemporary'], ['Romance', 'Mystery'], ['Foreign', 'Indie']],
  Series: [['Sci-Fi', 'Fantasy'], ['Crime', 'Thriller'], ['Drama', 'Comedy']],
  'Season 1': [['Episodes 1-5', 'Episodes 6-10'], ['Special', 'Extras'], ['Behind Scenes', 'Commentary']],
  'Season 2': [['Episodes 1-5', 'Episodes 6-10'], ['Special', 'Extras'], ['Behind Scenes', 'Commentary']],
  'Season 3': [['Episodes 1-5', 'Episodes 6-10'], ['Special', 'Extras'], ['Behind Scenes', 'Commentary']],
  Tutorials: [['Beginner', 'Intermediate'], ['Advanced', 'Expert'], ['Projects', 'Exercises']],
  Coding: [['JavaScript', 'TypeScript'], ['Python', 'Rust'], ['SQL', 'Shell']],
  Design: [['UI', 'UX'], ['Graphic', 'Motion'], ['3D', 'Illustration']],
  DevOps: [['Docker', 'Kubernetes'], ['CI/CD', 'Monitoring'], ['Cloud', 'Infrastructure']],
  Recordings: [['2022', '2023'], ['2024', 'Recent'], ['Archived', 'Exported']],
  Meetings: [['Daily Standup', 'Sprint Review'], ['Planning', 'Retrospective'], ['Client', 'Internal']],
  Lectures: [['Computer Science', 'Mathematics'], ['Physics', 'Engineering'], ['Business', 'Design']],
  Demos: [['Product', 'Feature'], ['Client', 'Internal'], ['Prototype', 'Final']],
  'Home Videos': [['Birthdays', 'Holidays'], ['Travel', 'Events'], ['Kids', 'Family']],
}

// Fallback sub-sub-folder names
const fallbackSubSub = [['Alpha', 'Beta'], ['Part 1', 'Part 2'], ['New', 'Old']]

// File templates per category
const fileTemplates: Record<string, Array<{ name: string; mime: string; minSize: number; maxSize: number }>> = {
  Documents: [
    { name: 'report.pdf', mime: 'application/pdf', minSize: 102400, maxSize: 5242880 },
    { name: 'notes.txt', mime: 'text/plain', minSize: 1024, maxSize: 51200 },
    { name: 'spreadsheet.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', minSize: 20480, maxSize: 2097152 },
    { name: 'presentation.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', minSize: 512000, maxSize: 10485760 },
    { name: 'document.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', minSize: 20480, maxSize: 1048576 },
    { name: 'readme.md', mime: 'text/markdown', minSize: 1024, maxSize: 10240 },
    { name: 'invoice.pdf', mime: 'application/pdf', minSize: 51200, maxSize: 524288 },
    { name: 'contract.pdf', mime: 'application/pdf', minSize: 102400, maxSize: 1048576 },
    { name: 'budget.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', minSize: 20480, maxSize: 524288 },
    { name: 'agenda.txt', mime: 'text/plain', minSize: 512, maxSize: 10240 },
  ],
  Downloads: [
    { name: 'setup.exe', mime: 'application/octet-stream', minSize: 1048576, maxSize: 52428800 },
    { name: 'archive.zip', mime: 'application/zip', minSize: 102400, maxSize: 52428800 },
    { name: 'installer.dmg', mime: 'application/x-apple-diskimage', minSize: 5242880, maxSize: 52428800 },
    { name: 'package.tar.gz', mime: 'application/gzip', minSize: 102400, maxSize: 10485760 },
    { name: 'update.msi', mime: 'application/x-msi', minSize: 524288, maxSize: 52428800 },
    { name: 'readme.txt', mime: 'text/plain', minSize: 1024, maxSize: 10240 },
    { name: 'changelog.txt', mime: 'text/plain', minSize: 2048, maxSize: 51200 },
    { name: 'license.txt', mime: 'text/plain', minSize: 1024, maxSize: 10240 },
  ],
  Pictures: [
    { name: 'photo.jpg', mime: 'image/jpeg', minSize: 512000, maxSize: 10485760 },
    { name: 'image.png', mime: 'image/png', minSize: 102400, maxSize: 5242880 },
    { name: 'wallpaper.jpg', mime: 'image/jpeg', minSize: 1048576, maxSize: 10485760 },
    { name: 'screenshot.png', mime: 'image/png', minSize: 51200, maxSize: 2097152 },
    { name: 'thumbnail.jpg', mime: 'image/jpeg', minSize: 10240, maxSize: 102400 },
    { name: 'avatar.png', mime: 'image/png', minSize: 5120, maxSize: 51200 },
    { name: 'raw_photo.raw', mime: 'image/x-raw', minSize: 10485760, maxSize: 52428800 },
    { name: 'edited.psd', mime: 'image/vnd.adobe.photoshop', minSize: 5242880, maxSize: 52428800 },
  ],
  Music: [
    { name: 'track.mp3', mime: 'audio/mpeg', minSize: 3145728, maxSize: 15728640 },
    { name: 'song.flac', mime: 'audio/flac', minSize: 20971520, maxSize: 52428800 },
    { name: 'audio.wav', mime: 'audio/wav', minSize: 10485760, maxSize: 52428800 },
    { name: 'podcast.mp3', mime: 'audio/mpeg', minSize: 15728640, maxSize: 52428800 },
    { name: 'ringtone.m4a', mime: 'audio/mp4', minSize: 512000, maxSize: 2097152 },
    { name: 'playlist.m3u', mime: 'audio/x-mpegurl', minSize: 512, maxSize: 10240 },
    { name: 'cover.jpg', mime: 'image/jpeg', minSize: 51200, maxSize: 512000 },
  ],
  Videos: [
    { name: 'video.mp4', mime: 'video/mp4', minSize: 10485760, maxSize: 52428800 },
    { name: 'movie.mkv', mime: 'video/x-matroska', minSize: 52428800, maxSize: 52428800 },
    { name: 'clip.avi', mime: 'video/x-msvideo', minSize: 5242880, maxSize: 52428800 },
    { name: 'recording.mov', mime: 'video/quicktime', minSize: 10485760, maxSize: 52428800 },
    { name: 'tutorial.mp4', mime: 'video/mp4', minSize: 5242880, maxSize: 52428800 },
    { name: 'thumbnail.jpg', mime: 'image/jpeg', minSize: 51200, maxSize: 512000 },
    { name: 'subtitles.srt', mime: 'application/x-subrip', minSize: 10240, maxSize: 102400 },
  ],
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomSize(min: number, max: number): bigint {
  return BigInt(randomInt(min, max))
}

function getSubSubFolders(parentName: string, idx: number): string[] {
  const sets = subSubfolderSets[parentName] ?? fallbackSubSub
  return sets[idx % sets.length] ?? sets[0]
}

// Pick files for a folder based on root category
function pickFiles(
  rootName: string,
  count: number,
  prefix: string,
): Array<{ name: string; mime: string | null; size: bigint }> {
  const templates = fileTemplates[rootName] ?? fileTemplates['Documents']
  const used = new Set<string>()
  const result: Array<{ name: string; mime: string | null; size: bigint }> = []

  let attempts = 0
  while (result.length < count && attempts < 100) {
    attempts++
    const tmpl = templates[randomInt(0, templates.length - 1)]
    // Make name unique within this folder by prefixing with an index
    const uniqueName = used.has(tmpl.name) ? `${prefix}_${result.length + 1}_${tmpl.name}` : tmpl.name
    if (!used.has(uniqueName)) {
      used.add(uniqueName)
      result.push({
        name: uniqueName,
        mime: tmpl.mime,
        size: randomSize(tmpl.minSize, tmpl.maxSize),
      })
    }
  }
  return result
}

async function insertFolder(
  parentId: bigint | null,
  name: string,
  depth: number,
  parentPath: string | null,
): Promise<FolderRow> {
  const rows = await sql<{ id: bigint }[]>`
    INSERT INTO folders (parent_id, name, path, depth)
    VALUES (
      ${parentId},
      ${name},
      ${(parentPath ? `${parentPath}.` : '') + '0'}::ltree,
      ${depth}
    )
    RETURNING id
  `
  const id = rows[0].id
  // Update path to use actual id
  const pathStr = parentPath ? `${parentPath}.${id}` : String(id)
  await sql`UPDATE folders SET path = ${pathStr}::ltree WHERE id = ${id}`
  return { id, path: pathStr, depth }
}

async function insertFiles(
  folderId: bigint,
  rootName: string,
  prefix: string,
  count: number,
): Promise<void> {
  const files = pickFiles(rootName, count, prefix)
  for (const f of files) {
    await sql`
      INSERT INTO files (folder_id, name, size_bytes, mime_type)
      VALUES (${folderId}, ${f.name}, ${f.size}, ${f.mime})
    `
  }
}

async function seed() {
  console.log('Seeding database...')

  await sql`TRUNCATE files, folders RESTART IDENTITY CASCADE`
  console.log('Truncated tables.')

  const rootNames = Object.keys(rootSubfolders)
  let totalFolders = 0
  let totalFiles = 0

  for (const rootName of rootNames) {
    // Insert root folder
    const root = await insertFolder(null, rootName, 0, null)
    totalFolders++

    // Insert 2-5 files in root folder
    const rootFileCount = randomInt(2, 5)
    await insertFiles(root.id, rootName, rootName, rootFileCount)
    totalFiles += rootFileCount

    const level1Groups = rootSubfolders[rootName]
    // Use 3-5 sub-folders from first group
    const subFolderNames = level1Groups[0].slice(0, randomInt(3, Math.min(5, level1Groups[0].length)))

    for (let i = 0; i < subFolderNames.length; i++) {
      const sub1Name = subFolderNames[i]
      const sub1 = await insertFolder(root.id, sub1Name, 1, root.path)
      totalFolders++

      // 2-5 files in level-1 folder
      const sub1FileCount = randomInt(2, 5)
      await insertFiles(sub1.id, rootName, sub1Name, sub1FileCount)
      totalFiles += sub1FileCount

      // 2-4 sub-sub-folders
      const sub2Names = getSubSubFolders(sub1Name, 0)
      const sub2Count = randomInt(2, Math.min(4, sub2Names.length))

      for (let j = 0; j < sub2Count; j++) {
        const sub2Name = sub2Names[j]
        const sub2 = await insertFolder(sub1.id, sub2Name, 2, sub1.path)
        totalFolders++

        // 2-5 files in level-2 folder
        const sub2FileCount = randomInt(2, 5)
        await insertFiles(sub2.id, rootName, `${sub2Name}_${j}`, sub2FileCount)
        totalFiles += sub2FileCount

        // 0-2 sub-sub-sub-folders (depth 3)
        const sub3Names = getSubSubFolders(sub2Name, 1)
        const sub3Count = randomInt(0, Math.min(2, sub3Names.length))

        for (let k = 0; k < sub3Count; k++) {
          const sub3Name = sub3Names[k]
          const sub3 = await insertFolder(sub2.id, sub3Name, 3, sub2.path)
          totalFolders++

          // 2-5 files in level-3 folder
          const sub3FileCount = randomInt(2, 5)
          await insertFiles(sub3.id, rootName, `${sub3Name}_${k}`, sub3FileCount)
          totalFiles += sub3FileCount
        }
      }
    }
  }

  console.log(`Seeding complete!`)
  console.log(`Total folders: ${totalFolders}`)
  console.log(`Total files:   ${totalFiles}`)

  await sql.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
