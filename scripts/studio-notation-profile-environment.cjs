// QA-only choice of a reviewed profile; never compensate or rescale engraving metrics.
function selectStudioNotationProfileEnvironment(samples) {
 let nativeWidth
 for(const width of[960,1400]){
  const sample=samples?.[width]
  if(!sample||sample.innerWidth!==width||sample.innerHeight!==1000||sample.rootOverflowing!==true)throw Error('Studio profile viewport/scrollable fixture environment changed')
  const size=sample.nativeScrollbarWidth
  if(![0,15].includes(size))throw Error('Unreviewed native scrollbar environment: '+size)
  if(sample.viewportScrollbarWidth!==size||sample.documentClientWidth!==width-size)throw Error('Application viewport gutter disagrees with independent native scrollbar environment')
  if(nativeWidth!==undefined&&nativeWidth!==size)throw Error('Native scrollbar environment changed between viewport captures')
  nativeWidth=size
 }
 return nativeWidth===0
  ?{kind:'overlay-0',fileName:'studio-r3-notation-profile.json',nativeScrollbarWidth:0}
  :{kind:'classic-15',fileName:'studio-r3-notation-profile-classic-15.json',nativeScrollbarWidth:15}
}
module.exports={selectStudioNotationProfileEnvironment}
