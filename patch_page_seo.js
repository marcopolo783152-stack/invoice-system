const fs = require('fs');
let content = fs.readFileSync('app/(public)/page.tsx', 'utf8');

const seoBlock = `
      {/* MASSIVE SEO KEYWORD MATRIX - DESIGNED TO RANK FOR EVERY SEARCH INTENT */}
      <div className="bg-[#1a1a1a] text-neutral-400 py-16 border-t border-neutral-800 text-xs font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          <div className="space-y-4">
            <h4 className="uppercase tracking-[0.2em] text-white font-bold text-xs">Service Areas</h4>
            <p className="leading-relaxed font-light">
              We provide luxury rug services, pickup, and delivery across the entire Washington D.C. Metropolitan Area, Northern Virginia, and Maryland.
            </p>
            <ul className="space-y-1.5 font-light">
              <li>Alexandria, VA (Old Town, Del Ray)</li>
              <li>Arlington, VA (Clarendon, Rosslyn)</li>
              <li>McLean, VA & Great Falls, VA</li>
              <li>Fairfax, VA & Vienna, VA</li>
              <li>Washington, D.C. (Georgetown, Capitol Hill)</li>
              <li>Bethesda, MD & Chevy Chase, MD</li>
              <li>Potomac, MD & Silver Spring, MD</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="uppercase tracking-[0.2em] text-white font-bold text-xs">Authentic Rug Types</h4>
            <p className="leading-relaxed font-light">
              We buy, sell, trade, and appraise all variations of authentic, hand-knotted, and machine-made oriental masterpieces.
            </p>
            <ul className="space-y-1.5 font-light">
              <li>Authentic Persian Rugs (Tabriz, Heriz, Isfahan)</li>
              <li>Antique Oushak & Turkish Rugs</li>
              <li>Afghan Tribal & Kilim Weaves</li>
              <li>Vintage Silk Rugs & Pure Wool Carpets</li>
              <li>Modern Geometric & Abstract Area Rugs</li>
              <li>Extra-Large Palace-Size & Mansion Rugs</li>
              <li>Long Hallway Runners & Foyer Rugs</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="uppercase tracking-[0.2em] text-white font-bold text-xs">Restoration & Repair</h4>
            <p className="leading-relaxed font-light">
              Our master weavers perform museum-quality repair and structural restoration on fragile antique textiles.
            </p>
            <ul className="space-y-1.5 font-light">
              <li>Hand-Reweaving Holes & Tears</li>
              <li>Fringe Repair & Replacement</li>
              <li>Edge Surging, Binding & Overcasting</li>
              <li>Color Run Correction & Dye Bleeding Fixes</li>
              <li>Moth Damage & Mildew Eradication</li>
              <li>Water Damage & Flood Restoration</li>
              <li>Rug Resizing & Custom Alterations</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="uppercase tracking-[0.2em] text-white font-bold text-xs">Specialized Wash & Care</h4>
            <p className="leading-relaxed font-light">
              Traditional submerged hand-washing guarantees the safest, most thorough deep clean for your investments.
            </p>
            <ul className="space-y-1.5 font-light">
              <li>Submerged Hand-Washing for Silk & Wool</li>
              <li>Enzymatic Pet Stain & Odor Removal</li>
              <li>Red Wine, Coffee & Ink Spot Treatment</li>
              <li>Allergen, Dust Mite & Soil Extraction</li>
              <li>Stain-Repellent Fabric Protection (Scotchgard)</li>
              <li>Custom-Cut Non-Slip Rug Pads</li>
              <li>Written Appraisals for Insurance & Estate</li>
            </ul>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-neutral-800 text-center md:text-left">
           <p className="text-[10px] leading-loose text-neutral-600 font-light max-w-5xl">
             <strong>Comprehensive Search Directory:</strong> Marco Polo Oriental Rugs is the premier destination for "oriental rug store near me", "persian rug cleaning near me", and "antique rug repair Alexandria VA". Whether you are searching for where to buy authentic hand-knotted Persian rugs in Washington DC, or need expert pet urine odor removal for a vintage Turkish Oushak carpet in Bethesda MD, our master artisans deliver unparalleled quality. Our inventory features high-end, investment-grade textiles including Kashan, Shiraz, Nain, Qum silk, Kazak, Chobi, Gabbeh, and Sarouk designs. Our service facility utilizes zero-chemical, traditional organic washing techniques to ensure the longevity of natural lanolin wool and silk fibers. Serving the entire DMV (District of Columbia, Maryland, Virginia) region with complimentary pickup and delivery options for oversized and heavy room-size carpets. We are fully insured and certified for high-value estate appraisals, rug padding installation, and complex fringe re-knotting.
           </p>
        </div>
      </div>

      {/* --- Footer Layout --- */}`;

content = content.replace('{/* --- Footer Layout --- */}', seoBlock);
fs.writeFileSync('app/(public)/page.tsx', content);
