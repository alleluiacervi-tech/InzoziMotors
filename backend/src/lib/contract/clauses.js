// The contract text.
//
// ⚠ NOT LEGALLY REVIEWED. These clauses were drafted to state, in contract
// language, what the Sawa Cars product already promises elsewhere — the 7-day
// return at a centre, Sawa Cars acting only as intermediary, RRA transfer inside
// 30 days. They are a starting point for a Rwandan advocate, not a substitute
// for one. Until that review happens, CONTRACT_DRAFT_MODE keeps a
// "DRAFT — NOT FOR SIGNATURE" watermark on every page (see render.js).
//
// Keep the text here, in one place, so a lawyer can be handed exactly one file
// to mark up. Clause numbers are stable: 4.1 must stay 4.1, because a superseded
// contract may be cited against a numbered clause.

const INTERMEDIARY_NOTE = (company) =>
  `Intermediary: ${company} (“Sawa Cars”), acting as inspection, handover and settlement agent. `
  + 'Sawa Cars is not the owner of the vehicle and is not a party to the transfer of title.';

const DECLARATION =
  'Each party declares that the identity details recorded above are their own and are supported by '
  + 'the document numbered in Section 1; that they enter this Agreement freely and with full capacity '
  + 'to do so; and that they have read and understood every clause in Section 4 before signing. '
  + 'Where a party does not read English, the terms have been explained to them in a language they '
  + 'understand before signature.';

/**
 * @param {object} s the contract snapshot — clauses that cite specific figures
 *   read them from here so the words and the data can never disagree.
 */
function CLAUSES(s) {
  const returnDays = s.terms.return_days ?? 7;
  const transferDays = s.terms.transfer_days ?? 30;
  const centre = s.terms.handover_center || 'a Sawa Cars centre';

  return [
    ['4.1', 'The Seller warrants that they are the lawful owner of the vehicle described in Section 2, '
      + 'that it is free of any lien, loan, charge, unpaid tax, insurance claim or pending court order, '
      + 'and that they are legally entitled to transfer ownership of it to the Buyer.'],

    ['4.2', 'The Seller warrants that the odometer reading recorded in Section 2 is the true distance '
      + 'travelled by the vehicle and has not been altered, and that they have disclosed every material '
      + 'defect known to them.'],

    ['4.3', 'The vehicle is sold in the condition recorded in Section 2 and in the inspection report '
      + 'annexed to this Agreement, which the Buyer confirms having read before signing. Defects '
      + 'disclosed in Section 2 or in that report are accepted by the Buyer and are not grounds for '
      + 'return under clause 4.6.'],

    ['4.4', 'Ownership of and risk in the vehicle pass to the Buyer at the moment the full balance '
      + `recorded in Section 3 has been received and all three parties have signed Section 6 at ${centre}. `
      + 'Until that moment the vehicle remains the property of the Seller.'],

    ['4.5', `Transfer of registration with the Rwanda Revenue Authority is the responsibility of the Buyer, `
      + `who undertakes to complete it within ${transferDays} days of handover. The Seller undertakes to `
      + 'provide every document and signature reasonably required for that transfer, and to do so without '
      + 'delay.'],

    ['4.6', `The Buyer may return the vehicle to the Sawa Cars centre within ${returnDays} calendar days of `
      + 'handover, for a full refund of the price recorded in Section 3, where a material defect is found '
      + 'that was not disclosed in Section 2 or in the annexed inspection report. This right applies only '
      + 'to a handover completed at a Sawa Cars centre, and does not cover damage arising after handover, '
      + 'ordinary wear, or consumable items.'],

    ['4.7', 'Sawa Cars acts as intermediary only. Sawa Cars does not own the vehicle, gives no warranty '
      + 'beyond the accuracy of its own inspection report as at the date of that report, and is not liable '
      + 'for either party’s performance of this Agreement. Fees payable to Sawa Cars are recorded in '
      + 'Section 3 and are separate from the price of the vehicle.'],

    ['4.8', 'Any notice under this Agreement is validly given if sent to the telephone number or address '
      + 'recorded for that party in Section 1.'],

    ['4.9', 'This Agreement, together with the annexed inspection report, is the entire agreement between '
      + 'the parties concerning the vehicle and replaces any earlier discussion or representation. Any '
      + 'variation must be in writing and signed by all three parties.'],

    ['4.10', 'This Agreement is governed by the laws of the Republic of Rwanda. The parties will attempt '
      + 'in good faith to settle any dispute through Sawa Cars’ mediation before commencing proceedings, '
      + 'and the courts of Kigali have jurisdiction over any dispute that mediation does not resolve.'],
  ];
}

module.exports = { CLAUSES, DECLARATION, INTERMEDIARY_NOTE };
