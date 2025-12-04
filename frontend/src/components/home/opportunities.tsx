const opportunities = () => {
  const opportunities = [
    {
      number: '1,200+',
      label: 'Full-Time Positions Available',
      gradient: true,
      height: 'h-[464px]', // Tallest - green card
      width: 'lg:w-[314px]',
    },
    {
      number: '850+',
      label: 'Contract Positions',
      gradient: false,
      height: 'h-[291px]', // Grey card - updated height
      width: 'lg:w-[320px]',
    },
    {
      number: '420+',
      label: 'Part-time positions',
      gradient: true,
      height: 'h-[464px]', // Tallest - green card (same as full-time)
      width: 'lg:w-[314px]',
    },
    {
      number: '680+',
      label: 'Gig positions',
      gradient: false,
      height: 'h-[291px]', // Grey card - updated height (same as contract)
      width: 'lg:w-[320px]',
    },
  ]

  return (
    <section className='w-full py-16 lg:py-24 px-4 lg:px-6 font-inter bg-white'>
      <div className='max-w-[1304px] mx-auto min-h-[669px]'>
        {/* Title and Subtitle */}
        <div className='flex flex-col items-center text-center mb-12 lg:mb-[100px] gap-4'>
          <h2 className='text-[#1C1C1C] text-[32px] lg:text-[48px] font-semibold leading-tight'>
            Opportunities for every career path.
          </h2>
          <p className='text-[#1C1C1C] text-[16px] lg:text-[18px] max-w-[600px] leading-relaxed'>
            Find the work arrangement that fits your lifestyle.
          </p>
        </div>

        {/* Opportunities Cards - Grid with mixed alignment for staggered effect */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 items-end'>
          {opportunities.map((opportunity, index) => (
            <div
              key={index}
              className={`${opportunity.height} w-full ${opportunity.width} rounded-[20px] p-6 lg:p-8 flex flex-col justify-between ${
                opportunity.gradient
                  ? 'bg-gradient-to-t from-[#ADED9A] to-button'
                  : 'bg-[#E1E1E1] border border-[#ADED9A]'
              } ${index === 3 ? 'lg:self-start' : ''} transition-transform duration-300 hover:scale-105 cursor-pointer`}
            >
              {/* Number at the top */}
              <div>
                <h3 className='text-[#1C1C1C] text-[48px] lg:text-[56px] font-semibold leading-none'>
                  {opportunity.number}
                </h3>
              </div>
              
              {/* Label at the bottom */}
              <div>
                <p className='text-[#1C1C1C] text-[18px] font-normal leading-[150%]'>
                  {opportunity.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default opportunities