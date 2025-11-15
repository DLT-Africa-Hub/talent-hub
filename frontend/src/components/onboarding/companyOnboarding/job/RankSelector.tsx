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

  return (
    <div className="flex flex-col gap-[12px] rounded-[20px] border border-[#1B77001A] bg-white p-[18px] shadow-[0_18px_40px_-24px_rgba(47,81,43,0.12)]">
      {rankOptions.map((rank) => {
        const isSelected = selectedRank === rank;
        return (
          <label
            key={rank}
            className={`flex cursor-pointer items-center gap-[12px] rounded-[12px] border-2 p-[12px] transition ${
              isSelected
                ? 'border-button bg-[#EFFFE2]'
                : 'border-fade bg-[#F8F8F8] hover:border-button/50'
            }`}
          >
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
          </label>
        );
      })}
    </div>
  );
};

export default RankSelector;

