const paths = {
  home: ['M3.5 10.5 12 3.5l8.5 7', 'M5.5 9v11h13V9', 'M9.5 20v-6h5v6'],
  events: ['M7 3v4m10-4v4', 'M4 10h16', 'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M8 14h3m3 0h2M8 17h3'],
  members: ['M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z', 'M5.5 20v-1a6.5 6.5 0 0 1 13 0v1', 'M18 4.5a3 3 0 0 1 1 5.8M21.5 19v-1a5 5 0 0 0-2.5-4.3'],
  ranking: ['M8 4h8v5a4 4 0 0 1-8 0V4Z', 'M8 6H4.5v2a4 4 0 0 0 4 4M16 6h3.5v2a4 4 0 0 1-4 4', 'M12 13v7m-4 0h8'],
  tv: ['M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'm10 9 5 3.5-5 3.5V9Z'],
  talk: ['M20.5 11.5a8.5 8.5 0 0 1-12 7.7L3.5 21l1.3-5A8.5 8.5 0 1 1 20.5 11.5Z', 'M8 10h8m-8 4h5'],
  diary: ['M6 3.5h12a2 2 0 0 1 2 2v15H7a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z', 'M4 17a3 3 0 0 1 3-3h13', 'M9 7h6m-6 3h4'],
  admin: ['M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 15h6v6H4v-6Zm10 0h6v6h-6v-6Z'],
  mypage: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M4 21v-1a8 8 0 0 1 16 0v1'],
  plus: ['M12 5v14M5 12h14'],
  arrow: ['M4 12h16m-6-6 6 6-6 6'],
  tune: ['M4 7h16M4 17h16M8 4v6m8 4v6'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
  pin: ['M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z', 'M14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z'],
}
export default function AppIcon({ type, className = '' }) {
  return <svg className={`app-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(paths[type] || paths.mypage).map((d, index) => <path key={index} d={d} />)}</svg>
}
