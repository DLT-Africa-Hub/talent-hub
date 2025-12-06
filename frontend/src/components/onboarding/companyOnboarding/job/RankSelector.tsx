export type RankOption =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'A and B'
  | 'B and C'
  | 'C and D';

interface RankSelectorProps {
  selectedRank: RankOption | '';
  onRankSelect: (rank: RankOption) => void;
}

// Rank score ranges based on assessment scoring
const RANK_SCORE_RANGES: Record<string, string> = {
  A: '85-100%',
  B: '75-84%',
  C: '60-74%',
  D: '< 60%',
};

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

  // Helper function to get score range for a rank
  const getRankScoreRange = (rank: RankOption): string => {
    if (rank.includes(' and ')) {
      // For combined ranks, show both ranges
      const ranks = rank.split(' and ');
      const range1 = RANK_SCORE_RANGES[ranks[0]] || '';
      const range2 = RANK_SCORE_RANGES[ranks[1]] || '';
      return `${range1} / ${range2}`;
    }
    return RANK_SCORE_RANGES[rank] || '';
  };

  return (
    <div className="flex flex-col gap-[12px] rounded-[20px] border border-[#1B77001A] bg-white p-[18px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
      {rankOptions.map((rank) => {
        const isSelected = selectedRank === rank;
        const scoreRange = getRankScoreRange(rank);
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
            {scoreRange && (
              <span className="text-[14px] font-medium text-[#1C1C1C80]">
                {scoreRange}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
};

export default RankSelector;
