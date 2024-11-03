export type sortModes = 'anagrams'|'quickmaths'|'spelling';
type Entry<T> = [any, T];

export const sorters = {
  'anagrams': (a:Entry<number[]>,b:Entry<number[]>) => (a[1][0]===b[1][0])?b[1][1]-a[1][1]:b[1][0]-a[1][0],
  'quickmaths': (a:Entry<number>,b:Entry<number>) => b[1] - a[1],
  'spelling': (a:Entry<number>,b:Entry<number>) => b[1] - a[1]
}

interface Entries {
  [id:string]: number|number[]
}[]

export function sortLeaderboard(rawdata:string, scope:string) {
  let data = JSON.parse(rawdata) as Entries;
  var entries = Object.keys(data).map((key) => {
    return [key, data[key]] as Entry<any>;
  });
  const sortmode = scope.split('_')[0] as sortModes;
  entries.sort(sorters[sortmode]);
  return entries;
}