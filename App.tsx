
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Skull, Crosshair, Target, Scaling, Trophy, Zap, Swords, UploadCloud, FileText, BarChart3, Trash2, CalendarDays, Rocket, ShieldQuestion, Clock, History
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface Kill {
  killerName: string; victimName: string; killerClan: string; victimClan: string;
  distance: number; weapon: string; timestamp: string; isNpcKill: boolean;
}
interface PlayerStats {
  name: string; clan: string; kills: number; deaths: number; kd: string; net: number;
}
interface LongestKill {
  distance: number; killerName: string; victimName: string; weapon: string;
}
interface WeaponStat { name: string; value: number; }
interface KillOverTime { date: string; TDB: number; 'Clan do Carrale': number; }
interface NemesisPair {
  player1: string; player2: string; player1Kills: number; player2Kills: number;
  player1Clan: string; player2Clan: string; total: number;
}

interface ProcessedStats {
  tdbKills: number; cdcKills: number; tdbKD: string; cdcKD: string;
  avgDistance: string; topKillerTDB: PlayerStats; topKillerCdC: PlayerStats;
  totalRivalryKills: number; longestKill: LongestKill;
  playerLeaderboard: PlayerStats[]; sortedWeapons: WeaponStat[];
  recentKills: Kill[]; distanceLeaderboard: Kill[];
  totalPlayers: number; killsOverTime: KillOverTime[]; nemesisPairs: NemesisPair[];
}

interface RecentFile {
  name: string;
  content: string;
  uploadedAt: string;
}

// --- HARDCODED CLAN DATA ---
const clanDataMap = new Map([
  ['TDB Bibakillbr', 'TDB'], ['TDB Emiza', 'TDB'], ['TDB GLA', 'TDB'], ['TDB LC', 'TDB'],
  ['TDB La Vendetta 2', 'TDB'], ['TDB Sensei', 'TDB'], ['TDB Wilso Waldo', 'TDB'],
  ['TDBfantasma', 'TDB'], ['Kowalski', 'TDB'], ['DGэЯмΑИØ', 'TDB'], ['InimigoDoCarrale', 'TDB'],
  ['P2Kid', 'Clan do Carrale'], ['Mewtwo', 'Clan do Carrale'], ['BRUTÃO', 'Clan do Carrale'],
  ['Carrale', 'Clan do Carrale'], ['Chineisinho', 'Clan do Carrale'], ['RATAO', 'Clan do Carrale'],
  ['Sabugador', 'Clan do Carrale'], ['21', 'Clan do Carrale'], ['Lubi', 'Clan do Carrale'],
]);

// --- REUSABLE UI & CHART COMPONENTS ---

const KPICard: React.FC<{ title: string; value?: string | number; unit?: string; icon: React.ReactNode; children?: React.ReactNode; className?: string }> = ({ title, value, unit, icon, children, className }) => (
  <div className={`bg-gray-900 p-5 rounded-lg shadow-lg flex flex-col justify-between min-h-[140px] border border-gray-700 hover:border-blue-500/50 transition-all duration-300 ${className}`}>
    <div>
      <div className="flex items-center justify-between mb-3"><h3 className="text-md font-semibold text-gray-400">{title}</h3>{icon}</div>
      {value != null && <p className="text-4xl font-bold text-white">{value}{unit && <span className="text-xl text-gray-400 ml-1.5">{unit}</span>}</p>}
    </div>
    {children && <div className="mt-2 text-sm text-gray-300">{children}</div>}
  </div>
);

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
  <div className={`bg-gray-900 p-6 rounded-lg shadow-lg w-full border border-gray-700 ${className}`}>
    <h3 className="text-2xl font-bold text-white mb-5 flex items-center">{icon}{title}</h3>
    {children}
  </div>
);

const HorizontalBarChart: React.FC<{ data: { name: string; value: number }[]; barColor: string }> = ({ data, barColor }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center text-sm">
          <div className="w-1/3 truncate pr-2 text-gray-300" title={item.name}>{item.name}</div>
          <div className="w-2/3 bg-gray-700 rounded-full h-5">
            <div
              className={`h-5 rounded-full flex items-center justify-end pr-2 text-black font-bold text-xs ${barColor}`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`, transition: 'width 0.5s ease-in-out' }}
            >
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const KillsOverTimeChart: React.FC<{ data: KillOverTime[] }> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500 py-10">Não há dados suficientes para exibir o gráfico.</div>;
    }
  const maxValue = Math.max(...data.map(d => d.TDB + d['Clan do Carrale']), 1);
  return (
    <div className="flex gap-2 h-48 items-end">
      {data.map((day, index) => (
        <div key={index} className="flex-1 flex flex-col items-center group">
          <div className="relative w-full h-full flex flex-col-reverse">
            <div className="bg-brand-cdc" style={{ height: `${(day['Clan do Carrale'] / maxValue) * 100}%`, transition: 'height 0.5s ease-in-out' }}></div>
            <div className="bg-brand-tdb" style={{ height: `${(day.TDB / maxValue) * 100}%`, transition: 'height 0.5s ease-in-out' }}></div>
          </div>
          <div className="text-xs text-gray-400 mt-2 whitespace-nowrap">{new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
          <div className="absolute bottom-20 hidden group-hover:block bg-gray-950 p-2 rounded-md shadow-lg border border-gray-700 text-xs z-10 min-w-max">
            <p className="font-bold">{new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            <p><span className="text-brand-tdb font-semibold">TDB:</span> {day.TDB} abates</p>
            <p><span className="text-brand-cdc font-semibold">CdC:</span> {day['Clan do Carrale']} abates</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const FileUploadScreen: React.FC<{ onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; error: string | null; loading: boolean; recentFiles: RecentFile[]; onRecentFileSelect: (content: string) => void; onDeleteRecentFile: (index: number) => void; }> = ({ onFileSelect, error, loading, recentFiles, onRecentFileSelect, onDeleteRecentFile }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-4 font-sans">
    <div className="bg-gray-900 p-10 rounded-lg shadow-2xl text-center max-w-2xl w-full border border-gray-700 animate-fade-in">
      <Rocket size={64} className="mx-auto text-brand-tdb mb-6" />
      <h2 className="text-3xl font-bold mb-4">Dashboard de Rivalidade SCUM</h2>
      <p className="text-gray-400 mb-8">Para começar, faça o upload do arquivo CSV `kill_log.csv` ou selecione um relatório recente.</p>
      <label className={`w-full flex items-center justify-center px-6 py-4 text-white font-semibold rounded-lg transition-all duration-300 ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 cursor-pointer hover:bg-blue-700 hover:scale-105'}`}>
        <FileText size={20} className="mr-2" />
        <span>{loading ? 'Processando...' : 'Selecionar Arquivo CSV'}</span>
        <input type="file" className="hidden" accept=".csv" onChange={onFileSelect} disabled={loading} />
      </label>
      {loading && <div className="mt-6 flex items-center justify-center text-blue-300"><Zap className="animate-spin mr-3" size={20} /><span>Analisando dados...</span></div>}
      {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-left"><strong className="block mb-2">Ocorreu um erro:</strong><span className="font-mono text-sm break-all">{error}</span></div>}
      
      {recentFiles.length > 0 && !loading && (
        <div className="mt-10 text-left">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center"><History size={20} className="mr-2"/> Relatórios Recentes</h3>
          <ul className="space-y-2">
            {recentFiles.map((file, index) => (
              <li key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded-md border border-gray-700">
                <div>
                  <p className="font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-gray-400">Carregado em: {new Date(file.uploadedAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onRecentFileSelect(file.content)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-md transition-colors">Carregar</button>
                  <button onClick={() => onDeleteRecentFile(index)} title="Remover do histórico" className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-md"><Trash2 size={18} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [stats, setStats] = useState<ProcessedStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [originalCsvText, setOriginalCsvText] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const cleanName = (name: string): string => name?.replace(/[😎😭]/g, '').trim() || '';
  const parseDistance = (distStr: string): number => parseInt(distStr?.replace('m', ''), 10) || 0;
  const calculateKD = (kills: number, deaths: number): string => (deaths === 0 ? kills.toFixed(2) : (kills / deaths).toFixed(2));

  const processData = useCallback(async (csvText: string, filterStartStr?: string, filterEndStr?: string) => {
    try {
      const filterStart = filterStartStr ? new Date(filterStartStr) : null;
      const filterEnd = filterEndStr ? new Date(filterEndStr) : null;

      const playerStats: { [key: string]: { name: string; clan: string; kills: number; deaths: number } } = {};
      const weaponStats: { [key: string]: number } = {};
      let tdbKills = 0, cdcKills = 0, totalRivalryDistance = 0;
      let longestKill: LongestKill = { distance: 0, killerName: 'N/A', victimName: 'N/A', weapon: 'N/A' };
      const allKills: Kill[] = [];
      const killsOverTime: { [key: string]: { TDB: number; 'Clan do Carrale': number } } = {};
      const nemesisPairsRaw: { [key: string]: number } = {};

      const rows = csvText.split('\n').slice(1);
      rows.forEach(row => {
        if (!row) return;
        const columns = row.split(',');
        if (columns.length < 8) return;

        const killData = { kill: columns[3], victim: columns[4], distance: columns[5], weapon: columns[6], timestamp: columns[7] };
        const killTimestamp = new Date(killData.timestamp);
        if (isNaN(killTimestamp.getTime())) return;
        
        if ((filterStart && killTimestamp < filterStart) || (filterEnd && killTimestamp > filterEnd)) return;
        
        const killerName = cleanName(killData.kill);
        const victimName = cleanName(killData.victim);
        if (!killerName || !victimName) return;

        const isNpcKill = killerName.startsWith('NPC ');
        const killerClan = clanDataMap.get(killerName) || 'Sem Clã';
        const victimClan = clanDataMap.get(victimName) || 'Sem Clã';
        
        const isRivalryKill = !isNpcKill && ((killerClan === 'TDB' && victimClan === 'Clan do Carrale') || (killerClan === 'Clan do Carrale' && victimClan === 'TDB'));
        if (!isRivalryKill) return;

        if (killerClan === 'TDB') tdbKills++; else cdcKills++;
        
        [killerName, victimName].forEach(name => {
          if (!playerStats[name]) {
            playerStats[name] = { name, clan: clanDataMap.get(name) || 'Sem Clã', kills: 0, deaths: 0 };
          }
        });
        playerStats[killerName].kills++;
        playerStats[victimName].deaths++;

        const weapon = killData.weapon || 'Desconhecida';
        weaponStats[weapon] = (weaponStats[weapon] || 0) + 1;
        
        const distance = parseDistance(killData.distance);
        totalRivalryDistance += distance;
        if (distance > longestKill.distance) longestKill = { distance, killerName, victimName, weapon };

        const dateKey = killTimestamp.toISOString().split('T')[0];
        killsOverTime[dateKey] = killsOverTime[dateKey] || { TDB: 0, 'Clan do Carrale': 0 };
        killsOverTime[dateKey][killerClan]++;

        const nemesisKey = `${killerName}|${victimName}`;
        nemesisPairsRaw[nemesisKey] = (nemesisPairsRaw[nemesisKey] || 0) + 1;

        allKills.push({ killerName, victimName, killerClan, victimClan, distance, weapon, timestamp: killData.timestamp, isNpcKill });
      });

      const playerLeaderboard = Object.values(playerStats).map(p => ({ ...p, kd: calculateKD(p.kills, p.deaths), net: p.kills - p.deaths })).filter(p => p.kills > 0 || p.deaths > 0).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
      const topKillerTDB = playerLeaderboard.find(p => p.clan === 'TDB') || { name: 'N/A', clan: 'TDB', kills: 0, deaths: 0, kd: '0.00', net: 0 };
      const topKillerCdC = playerLeaderboard.find(p => p.clan === 'Clan do Carrale') || { name: 'N/A', clan: 'Clan do Carrale', kills: 0, deaths: 0, kd: '0.00', net: 0 };
      
      const sortedKillsOverTime = Object.entries(killsOverTime).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).map(([date, data]) => ({ date, ...data }));
      
      const processedNemesis: { [key: string]: NemesisPair } = {};
      Object.entries(nemesisPairsRaw).forEach(([key, count]) => {
          const [killer, victim] = key.split('|');
          const sortedPair = [killer, victim].sort();
          const sortedKey = sortedPair.join('|');
          
          if (!processedNemesis[sortedKey]) {
              processedNemesis[sortedKey] = {
                  player1: sortedPair[0], player2: sortedPair[1],
                  player1Kills: 0, player2Kills: 0,
                  player1Clan: clanDataMap.get(sortedPair[0]) || 'Sem Clã',
                  player2Clan: clanDataMap.get(sortedPair[1]) || 'Sem Clã',
                  total: 0
              };
          }

          if (processedNemesis[sortedKey].player1 === killer) {
              processedNemesis[sortedKey].player1Kills += count;
          } else {
              processedNemesis[sortedKey].player2Kills += count;
          }
          processedNemesis[sortedKey].total += count;
      });
      const finalNemesisPairs = Object.values(processedNemesis).sort((a, b) => b.total - a.total).slice(0, 10);

      setStats({
        tdbKills, cdcKills, totalRivalryKills: tdbKills + cdcKills, longestKill, playerLeaderboard,
        tdbKD: calculateKD(tdbKills, cdcKills), cdcKD: calculateKD(cdcKills, tdbKills),
        avgDistance: tdbKills + cdcKills > 0 ? (totalRivalryDistance / (tdbKills + cdcKills)).toFixed(0) : '0',
        totalPlayers: playerLeaderboard.length, topKillerTDB, topKillerCdC,
        sortedWeapons: Object.entries(weaponStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        recentKills: allKills.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30),
        distanceLeaderboard: allKills.sort((a, b) => b.distance - a.distance).slice(0, 10),
        killsOverTime: sortedKillsOverTime,
        nemesisPairs: finalNemesisPairs,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? `Erro ao analisar CSV: ${err.message}` : "Ocorreu um erro desconhecido.");
      setStats(null);
    }
  }, []);
  
  const loadRecentFiles = useCallback(() => {
    try {
        const savedFiles = localStorage.getItem('scumRivalryRecentFiles');
        if (savedFiles) {
            setRecentFiles(JSON.parse(savedFiles));
        }
    } catch (e) {
        console.error("Failed to load recent files from localStorage", e);
        localStorage.removeItem('scumRivalryRecentFiles');
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
        loadRecentFiles();
        const savedFiles = localStorage.getItem('scumRivalryRecentFiles');
        if (savedFiles) {
            const files: RecentFile[] = JSON.parse(savedFiles);
            if (files.length > 0) {
                const initialContent = files[0].content;
                setOriginalCsvText(initialContent);
                await processData(initialContent);
            }
        }
        setLoading(false);
    };
    loadInitialData();
  }, [processData, loadRecentFiles]);
  
  const handleDataLoad = useCallback(async (csvText: string, fileName: string) => {
    setLoading(true);
    setError(null);
    setStats(null);
    setDateFilter({ start: '', end: '' });

    let currentFiles: RecentFile[] = [];
    try {
        const saved = localStorage.getItem('scumRivalryRecentFiles');
        if(saved) currentFiles = JSON.parse(saved);
    } catch (e) { console.error("Could not parse recent files."); }

    const newFile: RecentFile = { name: fileName, content: csvText, uploadedAt: new Date().toISOString() };
    const updatedFiles = [newFile, ...currentFiles.filter(f => f.name !== fileName)].slice(0, 5);
    localStorage.setItem('scumRivalryRecentFiles', JSON.stringify(updatedFiles));
    setRecentFiles(updatedFiles);

    setOriginalCsvText(csvText);
    await processData(csvText);
    setLoading(false);
  }, [processData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) { setError("Arquivo vazio ou ilegível."); setLoading(false); return; }
      handleDataLoad(csvText, file.name);
    };
    reader.onerror = () => { setError("Falha ao ler o arquivo."); setLoading(false); };
    reader.readAsText(file);
  };

  const handleDeleteRecentFile = (indexToDelete: number) => {
    const updatedFiles = recentFiles.filter((_, index) => index !== indexToDelete);
    setRecentFiles(updatedFiles);
    localStorage.setItem('scumRivalryRecentFiles', JSON.stringify(updatedFiles));
    // If the deleted file was the one being displayed, clear the dashboard
    if (stats && originalCsvText === recentFiles[indexToDelete].content) {
        setStats(null);
        setOriginalCsvText(null);
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleApplyFilters = async () => { if (!originalCsvText) return; setLoading(true); await processData(originalCsvText, dateFilter.start, dateFilter.end); setLoading(false); };
  const handleClearFilters = async () => { if (!originalCsvText) return; setLoading(true); setDateFilter({ start: '', end: '' }); await processData(originalCsvText); setLoading(false); };
  const handleForgetCsv = () => { localStorage.removeItem('scumRivalryRecentFiles'); window.location.reload(); };

  const { playerColumns, distanceColumns } = useMemo(() => ({
    playerColumns: [
        { header: '#', accessor: 'rank', className: 'w-12 font-bold' }, 
        { header: 'Jogador', accessor: 'name' }, 
        { header: 'Clã', accessor: 'clan' }, 
        { header: 'Kills', accessor: 'kills', className: 'font-bold text-green-400 text-center' }, 
        { header: 'Mortes', accessor: 'deaths', className: 'font-bold text-red-400 text-center' }, 
        { header: 'K/D', accessor: 'kd', className: 'font-bold text-sky-400 text-center' },
        { header: 'Net (K-D)', accessor: 'net', className: 'font-bold text-center'}
    ],
    distanceColumns: [{ header: '#', accessor: 'rank', className: 'w-12 font-bold' }, { header: 'Abateu', accessor: 'killerName' }, { header: 'Vítima', accessor: 'victimName' }, { header: 'Arma', accessor: 'weapon' }, { header: 'Distância', accessor: 'distance', className: 'font-bold text-sky-400' }]
  }), []);

  if (loading && !stats) return <FileUploadScreen onFileSelect={handleFileUpload} error={error} loading={true} recentFiles={recentFiles} onRecentFileSelect={(content) => handleDataLoad(content, "from history")} onDeleteRecentFile={handleDeleteRecentFile} />;
  if (!stats) return <FileUploadScreen onFileSelect={handleFileUpload} error={error} loading={false} recentFiles={recentFiles} onRecentFileSelect={(content) => handleDataLoad(content, "from history")} onDeleteRecentFile={handleDeleteRecentFile} />;

  const rankedPlayerData = stats.playerLeaderboard.map((p, i) => ({ ...p, rank: i + 1, net: p.net > 0 ? `+${p.net}`: p.net, className: p.net > 0 ? 'text-green-400' : p.net < 0 ? 'text-red-400' : 'text-gray-400', clan: (<span className={`font-semibold ${p.clan === 'TDB' ? 'text-brand-tdb' : 'text-brand-cdc'}`}>{p.clan}</span>) }));
  const rankedDistanceData = stats.distanceLeaderboard.map((k, i) => ({ ...k, rank: i + 1, distance: `${k.distance}m` }));
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 sm:p-6 md:p-8 font-sans relative">
      {loading && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"><Zap className="animate-spin text-brand-tdb" size={48} /></div>}
      
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-4xl font-extrabold text-white">Dashboard de Rivalidade</h1>
          <button onClick={handleForgetCsv} className="flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={14} className="mr-2" />Limpar Histórico</button>
        </div>
        <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg flex flex-col sm:flex-row justify-around items-center text-center">
          <div className="flex items-center"><h2 className="text-3xl md:text-5xl font-bold text-brand-tdb mr-4">{stats.tdbKills}</h2><span className="text-xl md:text-2xl text-gray-300">TDB</span></div>
          <div className="text-4xl text-gray-500 my-2 sm:my-0">vs</div>
          <div className="flex items-center"><span className="text-xl md:text-2xl text-gray-300 mr-4">Clan do Carrale</span><h2 className="text-3xl md:text-5xl font-bold text-brand-cdc">{stats.cdcKills}</h2></div>
        </div>
      </header>

      <div className="bg-gray-900 p-4 rounded-lg shadow-lg mb-8 flex flex-wrap items-end gap-4 border border-gray-700">
        <div className="w-full flex items-center gap-2"><CalendarDays size={20} className="text-gray-400" /><h3 className="text-lg font-semibold text-white">Filtrar por Período</h3></div>
        <div className="flex-1 min-w-[200px]"><label htmlFor="start-date" className="block text-xs font-medium text-gray-400 mb-1">De:</label><input type="datetime-local" name="start" value={dateFilter.start} onChange={handleFilterChange} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div className="flex-1 min-w-[200px]"><label htmlFor="end-date" className="block text-xs font-medium text-gray-400 mb-1">Até:</label><input type="datetime-local" name="end" value={dateFilter.end} onChange={handleFilterChange} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <button onClick={handleApplyFilters} className="p-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors h-10">Aplicar</button>
        <button onClick={handleClearFilters} className="p-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors h-10">Limpar</button>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="K/D TDB" value={stats.tdbKD} icon={<Scaling size={24} className="text-brand-tdb" />} />
                <KPICard title="K/D CdC" value={stats.cdcKD} icon={<Scaling size={24} className="text-brand-cdc" />} />
                <KPICard title="Distância Média" value={stats.avgDistance} unit="m" icon={<Target size={24} className="text-gray-400" />} />
                <KPICard title="Total de Abates" value={stats.totalRivalryKills} icon={<Swords size={24} className="text-gray-400" />} />
            </div>
            <Section title="Abates por Dia" icon={<CalendarDays size={24} className="mr-3 text-blue-400"/>}>
                <KillsOverTimeChart data={stats.killsOverTime} />
            </Section>
            <Section title="Leaderboard de Jogadores" icon={<Trophy size={24} className="mr-3 text-blue-400"/>}>
                <div className="overflow-x-auto"><table className="w-full min-w-max text-left"><thead><tr className="border-b border-gray-700">{playerColumns.map(c => <th key={c.header} className="p-3 text-sm font-semibold text-gray-400 uppercase tracking-wider text-center first:text-left">{c.header}</th>)}</tr></thead><tbody>{rankedPlayerData.map((r, i) => <tr key={i} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">{playerColumns.map(c => <td key={c.accessor} className={`p-3 text-white text-center first:text-left ${c.className || ''} ${c.accessor === 'net' ? r.className : ''}`}>{r[c.accessor]}</td>)}</tr></tbody></table></div>
            </Section>
            <Section title="Recorde de Distância" icon={<Crosshair size={24} className="mr-3 text-blue-400"/>}>
                 <div className="text-center">
                    <p className="text-6xl font-bold text-white">{stats.longestKill.distance}<span className="text-3xl text-gray-400 ml-2">m</span></p>
                    <p className="mt-2 truncate text-gray-300"><span className="font-bold text-green-400">{stats.longestKill.killerName}</span> matou <span className="font-bold text-red-400">{stats.longestKill.victimName}</span></p>
                    <p className="text-sm text-sky-400 truncate">com {stats.longestKill.weapon}</p>
                </div>
            </Section>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
            <Section title="Top Armas da Rivalidade" icon={<BarChart3 size={24} className="mr-3 text-blue-400"/>}>
                <HorizontalBarChart data={stats.sortedWeapons} barColor="bg-sky-500" />
            </Section>
            <Section title="Maiores Rivalidades (H2H)" icon={<ShieldQuestion size={24} className="mr-3 text-blue-400"/>}>
                <ul className="space-y-3">
                    {stats.nemesisPairs.map((pair, i) => {
                        const p1IsTdb = pair.player1Clan === 'TDB';
                        const p2IsTdb = pair.player2Clan === 'TDB';
                        return (
                        <li key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md text-sm">
                           <div className="flex items-center truncate">
                               <span className={`font-bold truncate pr-1 ${p1IsTdb ? 'text-brand-tdb' : 'text-brand-cdc'}`}>{pair.player1}</span>
                           </div>
                           <div className="flex items-center font-bold text-lg mx-2">
                               <span className="text-white bg-gray-700 px-2 rounded-md">{pair.player1Kills}</span>
                               <Swords size={14} className="text-red-500 mx-1.5 flex-shrink-0" />
                               <span className="text-white bg-gray-700 px-2 rounded-md">{pair.player2Kills}</span>
                           </div>
                           <div className="flex items-center truncate justify-end text-right">
                              <span className={`font-bold truncate pl-1 ${p2IsTdb ? 'text-brand-tdb' : 'text-brand-cdc'}`}>{pair.player2}</span>
                           </div>
                        </li>
                    )})}
                </ul>
            </Section>
            <Section title="Abates Recentes" icon={<Clock size={24} className="mr-3 text-blue-400"/>}>
                 <ul className="space-y-2 max-h-[40rem] overflow-y-auto pr-2 text-sm">{stats.recentKills.map((k, i) => <li key={i} className="flex flex-col p-2 bg-gray-800/50 rounded-md"><div className="flex justify-between items-center"><div className="flex items-center truncate"><span className={`font-bold truncate ${k.killerClan === 'TDB' ? 'text-brand-tdb' : 'text-brand-cdc'}`}>{k.killerName}</span><Swords className="mx-2 text-red-500 flex-shrink-0" size={14} /><span className={`font-bold truncate ${k.victimClan === 'TDB' ? 'text-brand-tdb' : 'text-brand-cdc'}`}>{k.victimName}</span></div><div className="text-gray-400 text-right flex-shrink-0 truncate font-mono text-xs">{k.distance}m</div></div><div className="flex justify-between items-center text-xs mt-1"><span className="text-gray-400 truncate">{k.weapon}</span><span className="text-gray-500">{new Date(k.timestamp).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</span></div></li>)}</ul>
            </Section>
        </div>
      </main>
      
      <footer className="text-center text-gray-500 mt-12 pt-8 border-t border-gray-800">
        <p>Dashboard gerado em {new Date().toLocaleString('pt-BR')}</p>
      </footer>
    </div>
  );
}
