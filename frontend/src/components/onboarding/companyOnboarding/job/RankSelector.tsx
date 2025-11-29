import { useQuery } from '@tanstack/react-query';
import companyApi from '../../../../api/company';

export type RankOption = 'A' | 'B' | 'C' | 'D' | 'A and B' | 'B and C' | 'C and D';

interface RankSelectorProps {
  selectedRank: RankOption | '';
  onRankSelect: (rank: RankOption) => void;
}

const RankSelector = ({ selectedRank, onRankSelect }: RankSelectorProps) => {
  const rankOptions: RankOption[] = [
    'A',
    'B',
    'C',
    'D',
    'A and B',
    'B and C',
    'C and D',
  ];

  // Fetch rank statistics
  const { data: rankStatsData } = useQuery({
    queryKey: ['rankStatistics'],
    queryFn: async () => {
      const response = await companyApi.getAvailableGraduates({ limit: 1 });
      return response.rankStatistics || {};
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const rankStats = rankStatsData || {};

  // Helper function to get percentage for a rank
  const getRankPercentage = (rank: RankOption): number => {
    if (rank.includes(' and ')) {
      // For combined ranks, show the average or sum of individual ranks
      const ranks = rank.split(' and ');
      const rank1 = rankStats[ranks[0]]?.percentage || 0;
      const rank2 = rankStats[ranks[1]]?.percentage || 0;
      return Math.round((rank1 + rank2) / 2);
    }
    return rankStats[rank]?.percentage || 0;
  };

  return (
    <div className="flex flex-col gap-[12px] rounded-[20px] border border-[#1B77001A] bg-white p-[18px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
      {rankOptions.map((rank) => {
        const isSelected = selectedRank === rank;
        const percentage = getRankPercentage(rank);
        return (
          <label
            key={rank}
            className={`flex cursor-pointer items-center justify-between gap-[12px] rounded-[12px] border-2 p-[12px] transition ${
              isSelected
                ? 'border-button bg-[#EFFFE2]'
                : 'border-fade bg-[#F8F8F8] hover:border-button/50'
            }`}
          >
            <div className="flex items-center gap-[12px]">
              <input
                type="radio"
                name="preferredRank"
                value={rank}
                checked={isSelected}
                onChange={() => onRankSelect(rank)}
                className="p-[20px] w-[20px] cursor-pointer accent-button"
              />
              <span className="text-[16px] font-medium text-[#1C1C1C]">
                {rank} Rank
              </span>
            </div>
            {percentage > 0 && (
              <span className="text-[14px] font-medium text-[#1C1C1C80]">
                {percentage}%
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
};

export default RankSelector;

