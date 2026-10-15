/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The regulars in the voice call, each drawn as themselves.
 *
 * Anybody in the call can be drawn as the pixel avatar, in any of its
 * colours, outfits and hats. A regular can have a drawing of their own
 * instead, and it lives here, chosen for them on the Voice call screen.
 *
 * Each is drawn on the avatar's own 100 x 100 grid, so a pixel of theirs is
 * exactly a pixel of the avatar's and the two sit side by side in the call
 * at the same size. Its rows are one letter a pixel, a for its first colour,
 * b for its second and so on, '.' for none, and it is drawn as it was given:
 * its own colours, not the avatar's.
 *
 * It talks by opening its mouth: `talking` is what changes when it does, a
 * patch like the avatar's faces ('.' leaves a pixel as it is), laid over the
 * rows in time with the voice. It blinks when the avatar would, if it has
 * eyelids (`blink`: patches for the eyes half shut and shut), and it
 * breathes the way the avatar does, in two steps: the rows below
 * `breathSplit` rise a pixel first, over the row above them, and the rest
 * follows. It hops as the avatar does while it talks.
 *
 * And it turns, if it has a `front` view — the same rows, mouth, lids and
 * breath of its own. The drawing as first given faces your left; facing your
 * right is that drawing mirrored, with whatever `mirrorKeep` names (writing)
 * copied back unmirrored so it still reads; and the front view is between
 * the two, so a turn from one side to the other passes through it. In the
 * call it faces whoever is talking, and the front while nobody is.
 *
 * To add somebody: their art in two frames, mouth shut and mouth open, on a
 * 100 x 100 grid — and a front view the same way to have them turn.
 * art/avatar/regulars/ keeps the pictures each was taken from.
 */

export const AVATAR_REGULARS = {
  /*
    Switsed: the shark with the delivery backpack. Taken from 1024 x 1024
    frames — from the side, art/avatar/regulars/shark-quiet.jpg and
    shark-talking.jpg, and from the front, shark-front-quiet.jpg and
    shark-front-talking.jpg — whose pixels all measure 10.24 of the
    picture's across and down, exactly the avatar's grid, and are one colour
    each. The JPEG's drift is folded back into the colours they were drawn
    with, one palette for both views, and each pixel is whichever of them is
    nearest the picture there. The black background is left out, and from
    the side the black seen through the backpack's handle and loops; the
    black of the eyes and straps is kept, and so is black edging that met
    the background with nothing between — along the right fin by the strap,
    and the backpack's top under the handle — which the side view draws in
    the background's own black. Each talking frame is used for its mouth
    alone: elsewhere they were drawn again a shade off (36 pixels from the
    side, 15 from the front), which would shimmer every time he spoke.

    The backpack's lettering is drawn again: the picture squeezed "Rappi
    Turbo" into 12 pixels, where it read "Rppi Turlo". Its face is 15 pixels
    across; "rappi" in lower case fills them exactly with a pixel between
    letters, and "turbo" would need 17, so it is left off rather than drawn
    illegibly.
  */
  shark: {
    name: 'Switsed',
    palette: ['#ffffff', '#4e7bae', '#161939', '#ced4e7', '#000000', '#f15230', '#375c91', '#343536', '#23201e', '#c62d12', '#80aee0', '#454f7d', '#9d9ea8', '#b9c6da', '#243a6a', '#828285', '#8fa2ca', '#a6b5cf', '#515a64', '#788eb8', '#636b71', '#e6edf6', '#ea6544', '#532b1c', '#677b97'],
    rows: [
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '..........................................ccccccccc.................................................',
      '........................................ccogbbbbbgcccc..............................................',
      '......................................ccgbbbbbbbbbbkbcc.............................................',
      '.....................................ccbbbbbbbbbbbbbbkbcc...........................................',
      '....................................ccbbnaaaaddbbbbbbbkkcc..........................................',
      '...................................ccbdaaaaaaaadbbbbbbbbkgc.........................................',
      '...................................cbdaaaaaaaaaadbbbbbbbbkbc........................................',
      '..................................ccdaaaaaaaaaaaadbbbbbbbbkbc.......................................',
      '.................................ccbaaaaaaaaaaaaaadbbbbbbbbkbc......................................',
      '.................................cbdaaaaaaaaaaaaaaadbbbbbbbbkbc.....................................',
      '................................ccnaaaaaaaaaaaaaaaaabbbbbbbbbkbc....................................',
      '................................cbaaaaaaaaaaaaaaaaaadbbbbbbbbbkgc...................................',
      '...............................ccdaaaaaaaaaaaaaaaaaaabbbbbbbbbbkcc..................................',
      '...............................cbaaaaaaaaaaaaaaaaaaaadbbbbbbbbbkkc..................................',
      '..............................ccnaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbkbc.................................',
      '..............................cbaaaaaaaaaaaaaaaaaaaaaadbbbbbbbbbbkcc................................',
      '..............................cnaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbkc....hhhhhh......................',
      '.............................conaaaaaaaaaaaaaaaaaaaaaaadbbbbbbbbbbkbcehhhhhhhhhh....................',
      '.............................cbaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbkcchh......hhh...................',
      '............................ccdaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbgch........hhh..................',
      '............................cgdaaaaaaaaaaaaaaaaaaaaaaaaanbbbbbbbbbbbkgc........hhh..................',
      '............................cbaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbkciiiiiiiiehheiiiiiiiiiiiii....',
      '...........................ccdaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbkccffffffwfeeeiihhhiffffffii...',
      '...........................ccdaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbbbbbbbbkciiiiiiiffffffiihhiffffffi...',
      '........................ccccbaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbceeeeegbbbbccjjjjjiiiffffffihhifffffii..',
      '.......................ceeecbaaaaaaaaaaaaaaaaaaaaaaaaaaaaabceeeeeeecbbbbcjjjjjjjiffffffihhiffffffi..',
      '......................cemthcdaaaaaaaaaaaaaaaaaaaaaaaaaaaancehaaheeeecbbbccjjjjjjiiffffffihiffffffi..',
      '.....................cemaahcdaaaaaaaaaaaaaaaaaaaaaaaaaaaacehaaaaeeeeecbbgcjjjjjjjiffffffihifmmmmmi..',
      '.....................chaaacbaaaaaaaaaaaaaaaaaaaaaaaaaaaabehaaaaaeeeeeelbbcjjjjjjjiffffmmmmmmmmmmmi..',
      '....................cehaahcdaaaaaaaaaaaaaaaaaaaaaaaaaaaaeehaaaahheeeeecbbccjjjjjjimmmmmmmmmmmmmmmi..',
      '....................cehhhhcdaaaaaaaaaaaaaaaaaaaaaaaaaaaaeehmaahhheeeeecbbgcjjjjjjimmmmmmmmmmmmmmmi..',
      '....................ceaeeecdaaaaaaaaaaaaaaaaaaaaaaaaaaaaeehhheeeeeeheecbbgcjjjjjjimmmmmmmmmmfffffi..',
      '....................ceeeeecaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeeaeeeeeeehhecbbbccjjjjjimmmmfffffffffffi..',
      '....................ceheeegaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeeshecbbbgcjjjjjifffffffffffffffi..',
      '....................ceshecgaaaaaaaaaaaaaaaaaaaaaaaaaaaaaceieeeeeeesahecbbbgcjjjjjifffffffffffffffi..',
      '.....................cehhcnaaaaaaaaaadddddddaaaaaaaaaaaadeeieeeeesameegbbbgccjjjjifffffffffffffffi..',
      '.....................ceehcaaaaaaaaddcccccccccdaaaaaaaaaaaceihhhhssseecbbbbgocjjjjifffffffffffffffi..',
      '......................ceccaaaaaaadccdddhaacddcndaaaacaaaadceehhhhheecbbbbbbgcjjjjifffffffffffffffi..',
      '.......................ccbaaaaaadcahcacracdcarccdaadcdaaaadceeeeeeecbbbbglbgcjjjjifffffffffffffffi..',
      '.......................ccbaaacancacdmcnrcrrrcnaccnncdgaaaaddgccccclbbbbocgbgccjjjiffffffffffffffai..',
      '.......................cgbaaaaccccdddaaaaaaddccanccdaaaaaaaddbbbbbbbbboccgbgocjjjifffffffffffffffi..',
      '.......................cbdaaaaaddaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbbbbociobbggcjjjiaafaafaaffaaffai..',
      '.......................cbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddbbbbbgiicobbbggcjjjiafffafafafafafai..',
      '.......................cbaaaaaaaaaaabtgaaabbaaaaaaaaaaaaaaaaddbbboiiiiobbbcbgcjjjiaffaafafafafafai..',
      '.......................cbaaaaaaaaaabaddbbbddbdaaaaaaaaaaaaaaadbbciiccobbbiibgccjjiafafafafafafafai..',
      '......................ccbaaaaaaaaaaaaadddddaaaaaaaaaaaaaaaaaadbbbbbbbbbbccobggcjjiaffaafaaffaaffai..',
      '......................cgbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddbbbbbbboicobbggcjjiffffffafffaffffi..',
      '......................cgbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbboicccobbbgeeejiffffffafffaffffi..',
      '......................cbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbcciicobbbeehhejifffffffffffffffi..',
      '......................cbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbbbbbbeehhheejifffffffffffffffi..',
      '......................cbnaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbbbbeehhhheecjifffffffffffffffi..',
      '......................cbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbboeehhheeggcjifffffffffffffffi..',
      '......................ebaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbcehhhheegggcjifffffffffffffffi..',
      '.....................eebaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbeehhheebbgggcjifffffaaffaaffffi..',
      '....................ehebaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbehhhhebbbbgggcjiffffaaaaaaaafafi..',
      '....................ehebaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhhhebbbbbgggcjifafaaaaaaaaaaafi..',
      '....................ehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadeehhhebbbbgggggccifaaaaaaaaaaaaffi..',
      '....................ehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadehhhebbbbbgogggociffaaaaaffaaafffi..',
      '....................ehhheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhhebbbbbbbcggggcifffaaafffffffffi..',
      '.....................ehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhhebbbbbbbgcgggcifffffffffffffffi..',
      '....................cehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhhebbbbbbbbgcgggcifffffffffffffffi..',
      '....................ccehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhhebbbbbbbbbccggcifffffffffffffffi..',
      '....................ccehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkbbbbbbbgcggcifffffffffffffffi..',
      '...................cocehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkbbbbbbbgcggciiffffffffffffffi..',
      '...................cgcehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkbbbbbbbgcggciiffffffffffffffi..',
      '...................cgcehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkbbbbbbbgccgciiffffffffffffffi..',
      '...................cgcehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkbbbbbbbggcgciiffffffffffffffi..',
      '..................ccgcehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkkbbbbbbggcgciifffffffffffffji..',
      '..................cbgcehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaehhecbkkbbbbbbggcgciifffffffffffjjji..',
      '..................cbgcehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadehhecckkbbbbbbggcgciifffffffffjjjjii..',
      '..................cbgceheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadehhhecbkkbbbbbggcgcjifffffffjjjjjii...',
      '..................cbgehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddehhecbkkbbbbbggcgcjifffjjjjjjiiie....',
      '..................cbgehheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddehhhcbkkbbbbbggcccjijjjjjjiii...p....',
      '..................cbgeheaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddehhccbkkbbbbggcccijjjjiii..p...p....',
      '..................cbgehedaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddehhhcbkkbbbbggccxjjiii.....p..p.....',
      '..................cbbeeenaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddddehhcbkkbbbgggcciii..p......pp......',
      '..................cbbgebbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddddbehccbkkbbgggcc.p...p..............',
      '..................cbbgcbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddddbbeecgbkbggggcc.p...p..............',
      '..................cbbgcbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddddddbbbgicgbbgggccc..ppp...............',
      '..................ccbgcbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddddbbbbggcggggggcc.....................',
      '...................cbgcgbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddddddbbbbggccgggggcc.....................',
      '...................ccgccbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddddddbbbbbggiggggccc.....................',
      '....................ccccbbraaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddddddbbbbbggoigggigc.....................',
      '.......................cbbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaddddddddtbbbbbbgggcccgcc.....................',
      '.......................cgbbddaaaaaaaaaaaaaaaaaaaaaaaaadddddddddbbbbbbbgggggggc......................',
      '.......................ccbbbddaaaaaaaaaaaaaaaaaaaaaaadddddddddrbbbbbbggggggggc......................',
      '........................cbbbdddaaaaaaaaaaaaaaaaaaaaaddddddddddbbbbbbbgggggggcc......................',
      '........................cgbbbddddaaaaaaaaaaaaaaaaaddddddddddddbbbbbbggggggggc.......................',
      '........................ccbbbndddddaaaaaaaaaaaaadddddddddddddbbbbbbbggggggggc.......................',
      '........................ccbbbbdddddddaaaaaaaadddddddddddddddrbbbbbbggggggggcc.......................',
      '.........................cgbbbbdddddddddddddddddddddddddddddbbbbbbgggggggggc........................',
      '.........................ccbbbbbdddddddddddddddddddddddddddbbbbbbgggggggggcc........................',
    ],
    talking: { at: [29, 43], rows: [
      '.......dccccc............',
      '......c.ddddd............',
      '.......aaac..ac..c.....a.',
      '......c...ccac..a.....aaa',
      'a.....cc.cc.ccc.a...daaaa',
      '.a...ccccccccccc..cc.aa..',
      '.dcccccccccccccccccccn...',
      '.ccccccccccclllllllccc...',
      '.ccccccccllllllllllllcd..',
      '.cccccccaclcalllcllllcd..',
      '.cccc.cc.acaaclc.clllcd..',
      '.dccd..d......c...clcn...',
      '..dcccccccccccccccccd....',
    ] },
    /*
      His eyelids, which the picture does not have: drawn from his eyes as
      they are, the skin around each carried over it — on the right eye the
      white of his face and the blue of his head meeting across it where they
      meet above and below — closing on a black line along the lower lid. The
      left eye bulges past his silhouette from the far side of his head, so
      its outline stays and the lid goes over the bulge.
    */
    blink: {
      half: [
        { at: [55, 31], rows: [
          '...............b',
          '.....bbbbbbb....',
          '..d.bbbbbbbbb...',
          '..dbbbbbbbbbbb..',
          '..adbbbbbbbbbbb.',
          '.aadbbbbbbbbbbbb',
          '.aadbbbbbbbbbbbb',
          '.aadbbbbbbbbbbbb',
          '...eee......e..e',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
        ] },
        { at: [19, 31], rows: [
          '..........',
          '..........',
          '.....bbb..',
          '....bbbb..',
          '...bbbbb..',
          '...bbbb...',
          '..bbbbb...',
          '..bbbbb...',
          '...e......',
          '..........',
          '..........',
          '..........',
          '..........',
          '..........',
          '..........',
          '..........',
          '..........',
        ] },
      ],
      shut: [
        { at: [55, 31], rows: [
          '...............b',
          '.....bbbbbbb....',
          '..d.bbbbbbbbb...',
          '..dbbbbbbbbbbb..',
          '..adbbbbbbbbbbb.',
          '.aadbbbbbbbbbbbb',
          '.aadbbbbbbbbbbbb',
          '.aadbbbbbbbbbbbb',
          '.aadbbbbbbbbbbbb',
          '..adbbbbbbbbbb.b',
          '.a..bbbbbbbbeebb',
          '.aae.......eebbb',
          '.aaae.....eebbbb',
          '..aadbbbbbbbbbb.',
          '..aadbbbbbbbbb..',
          '...adbbbbbbbb...',
          '...a.bbbbbbb....',
          '................',
        ] },
        { at: [19, 31], rows: [
          '..........',
          '..........',
          '.....bbb..',
          '....bbbb..',
          '...bbbbb..',
          '...bbbb...',
          '..bbbbb...',
          '..bbbbb...',
          '...bbb....',
          '..b...b...',
          '..bb.b....',
          '..bbbb....',
          '...bbb....',
          '...bbb....',
          '....bb....',
          '..........',
          '..........',
        ] },
      ],
    },
    /*
      Where he breathes from: rows 71 to 74 differ by a pixel each, so the
      rows below 72 can rise a pixel over the one above it before the rest
      follows, and nothing shows it but the breath.
    */
    breathSplit: 72,
    /*
      From the front. The picture has no straps; they are drawn as the side
      view draws them — a black edge, two pixels of the dark grey, a black
      edge — down the strip of his blue side between each fin's inner edge
      and his belly, where the side view's run: over his shoulder from
      behind just below the gills, and round behind the fin at the bottom,
      showing in the gap under it. The lids are his side view's far eye's:
      both eyes bulge past his silhouette from the front. He breathes from
      the same row as from the side, 72, where two rows here are the same.
    */
    front: {
      rows: [
        '....................................................................................................',
        '....................................................................................................',
        '....................................................................................................',
        '....................................................................................................',
        '....................................................................................................',
        '....................................................................................................',
        '....................................................................................................',
        '....................................................................................................',
        '..............................................cccccccc..............................................',
        '............................................cccgbbbbgccc............................................',
        '..........................................ccgbbbbbbbbbbgcc..........................................',
        '........................................ccgtbbbbbbbbbbbbkgcc........................................',
        '.......................................ccbkbbbbbbbbbbbbbbkgcc.......................................',
        '......................................ccbkbbbbbbddddbbbbbbkbcc......................................',
        '.....................................ccbkbbbbbdaaaaaadbbbbbkbcc.....................................',
        '....................................ccbkbbbbbdaaaaaaaadbbbbbkbcc....................................',
        '...................................ccbkbbbbbaaaaaaaaaaaabbbbbkbcc...................................',
        '..................................ccbkbbbbbdaaaaaaaaaaaadbbbbbkbcc..................................',
        '..................................cbkbbbbbdaaaaaaaaaaaaaadbbbbbkbc..................................',
        '.................................cokkbbbbdaaaaaaaaaaaaaaaanbbbbbklc.................................',
        '................................cckkbbbbnaaaaaaaaaaaaaaaaaanbbbbkkcc................................',
        '................................cbkbbbbbdaaaaaaaaaaaaaaaaaadbbbbbkbc................................',
        '...............................cgkbbbbbdaaaaaaaaaaaaaaaaaaaadbbbbbkgc...............................',
        '..............................cckkbbbbbaaaaaaaaaaaaaaaaaaaaaabbbbbkkcc..............................',
        '..............................cbkbbbbbdaaaaaaaaaaaaaaaaaaaaaadbbbbbkbc..............................',
        '.............................cokkbbbbbaaaaaaaaaaaaaaaaaaaaaaaabbbbbbkoc.............................',
        '.............................cbkbbbbbdaaaaaaaaaaaaaaaaaaaaaaaadbbbbbkbc.............................',
        '.............................ckbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbkc.............................',
        '............................cgkbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbkgc............................',
        '............................cqbbbbbbdaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbbtc............................',
        '...........................ccqbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbtcc...........................',
        '...........................cbbbbbbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbbbc...........................',
        '........................cccccclbbbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbgcccccc........................',
        '.......................ceeeeeeecbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbceeeeeeec.......................',
        '......................ceehaaheeecbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbcehnaaheeec......................',
        '.....................ceehaaaaheeecdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadcehaaaaaheeec.....................',
        '.....................cesaaaaaheeeelaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaleedaaaaaheeec.....................',
        '....................ceeraaaahheeeeeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeedaaaahheeeec....................',
        '....................ceehaaahheeeeeeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeehaaahheeeeec....................',
        '....................ceeehhhheeeeheeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeeehhhheeeehec....................',
        '....................ceeeaeeeeeeeheeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeeaeeeeeeeehec....................',
        '....................ceheeeeeeeehheeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeehhec....................',
        '....................cehheeeeeesvhecaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaceheeeeeeesahec....................',
        '.....................cehheeeehapeedaaaaaaaaaaddddddddddaaaaaaaaaadeehheeeehapec.....................',
        '.....................ceehhhhhuueecaaaaaaaaandccccccccccddaaaaaaaaaceehhhhhuueec.....................',
        '......................ceehhhhheecdaaaaaaadncccdaacdadcvccodaaaaaaadceehhhhheec......................',
        '......................cceeeeeeecdaaaaaaadccdaycacdcacncanccdaaaaaaadceeeeeeecc......................',
        '......................cgcccccccnaaaaaaadccaccdnccddccnnccaccdaaaaaaadcccccccgc......................',
        '......................cgbbbbbbbaaaaaaaacccccdaaaaaaaaaadcccccaaaaaaaabbbbbbbgc......................',
        '......................cgbbbbbbdaaaaaaadcdaaaaaaaaaaaaaaaaaadcdaaaaaaadbbbbbbgc......................',
        '.....................cccbbbbbbdaaaaaaaddaaaaaaaaaaaaaaaaaaaaddaaaaaaadbbbbbbccc.....................',
        '.....................cgcccbbbbaaaaaaaaaaaaaaabbgaaaagbbaaaaaaaaaaaaaaabbbbcccgc.....................',
        '.....................cgbcccgbbaaaaaaaaaaaaaabdadbbbbdadbaaaaaaaaaaaaaabbgcccbgc.....................',
        '.....................ccbbbbbbdaaaaaaaaaaaaaaaaaaddddaaaaaaaaaaaaaaaaaadbbbbbbcc.....................',
        '.....................cccbbbbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbbccc.....................',
        '....................ecgcccgbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbgcccgce....................',
        '....................eegbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbgee....................',
        '....................ehebbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbehe....................',
        '....................ehhecgbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbgcehhe....................',
        '....................ehhebbbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbehhe....................',
        '....................ehhebbbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbbehhe....................',
        '....................cehhebbbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbbehhec....................',
        '...................cgehhebbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbehhegc...................',
        '...................cbehhebbdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbbehhebc...................',
        '..................cbbgehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhegbbc..................',
        '..................ckbbehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhebbkc..................',
        '.................cbkbbehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhebbkbc.................',
        '.................ckbbbehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhebbbkc.................',
        '................cckbbbehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhebbbkcc................',
        '................ckbbbbehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhebbbbkc................',
        '................ckbbbcehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhecbbbkc................',
        '...............cckbbgcehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhecgbbkcc...............',
        '...............ckbbbcgehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhegcbbbkc...............',
        '...............ckbbbcgehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhegcbbbkc...............',
        '...............ckbbbcgehhebdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadbehhegcbbbkc...............',
        '..............cckbbgcgehhebddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddbehhegcgbbkcc..............',
        '..............cbkbbgcgehhebddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddbehhegcgbbkbc..............',
        '..............ckbbbgcgehhebddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddbehhegcgbbbkc..............',
        '..............ckbbbgcgehhebddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddbehhegcgbbbkc..............',
        '..............ckbbbgcgehhebdddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddbehhegcgbbbkc..............',
        '..............cbbbbgcgehhebdddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddbehhegcgbbbbc..............',
        '..............cbbbbgcgehhebdddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddbehhegcgbbbbc..............',
        '..............cbbbggcgehhebqddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddqbehhegcggbbbc..............',
        '..............cbbbgggcehhebbdddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddbbehhecgggbbbc..............',
        '..............cbbbgggehhebbbdddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddbbbehhegggbbbc..............',
        '..............cgbgggcehhebbbddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddbbbehhecgggbgc..............',
        '..............cgggggehhebbbbddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddbbbbehhegggggc..............',
        '..............ccgggceheggbbbrdddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddrbbbggehecgggcc..............',
        '...............cgggceegggbbbbddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddbbbbgggeecgggc...............',
        '...............cggccecgggbbbbdddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddddbbbbgggceccggc...............',
        '................ccc..ccgggbbbqddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddqbbbgggcc..ccc................',
        '.....................ccgggbbbbdddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddddbbbbgggcc.....................',
        '......................cggggbbbddddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaddddddbbbggggc......................',
        '......................cggggbbbqddddddaaaaaaaaaaaaaaaaaaaaaaaaaaddddddqbbbggggc......................',
        '......................ccggggbbbddddddddaaaaaaaaaaaaaaaaaaaaaaddddddddbbbggggcc......................',
        '.......................cggggbbbqddddddddaaaaaaaaaaaaaaaaaaaaddddddddqbbbggggc.......................',
        '.......................cgggggbbbddddddddddaaaaaaaaaaaaaaaaddddddddddbbbgggggc.......................',
        '.......................ccgggggbbbdddddddddddddaaaaaaaadddddddddddddbbbgggggcc.......................',
        '........................cgggggbbbtddddddddddddddddddddddddddddddddqbbbgggggc........................',
        '........................ccgggggbbbqddddddddddddddddddddddddddddddqbbbgggggcc........................',
      ],
      talking: { at: [37, 43], rows: [
        '..........cccccc..........',
        '......d...dddddd..........',
        '.........a...c.aac........',
        '......a.c...c.cac..a......',
        '......a.cc..cc..cc.a......',
        '.......cccccccccccc.......',
        '.n.cccccccccccccccccccc...',
        '.ccccccccllllllllcccccccc.',
        'dcccccclllcllllclllccccccd',
        'dcccccllllacllcallllcccccd',
        'dccccd.clc.acca.clc.dccccd',
        '.dccd...c........c...dccd.',
        '..dccccccccccccccccccccd..',
      ] },
      blink: {
        half: [
          { at: [19, 31], rows: [
            '.................',
            '........b........',
            '.....bbbbbb......',
            '....bbbbbbbbb....',
            '...bbbbbbbbbbb...',
            '...bbbbbbbbbbb...',
            '..bbbbbbbbbbbbb..',
            '..bbbbbbbbbbbbb..',
            '.....eeee....e...',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
          ] },
          { at: [64, 31], rows: [
            '.................',
            '........b........',
            '......bbbbbb.....',
            '....bbbbbbbbb....',
            '...bbbbbbbbbbb...',
            '...bbbbbbbbbbb...',
            '..bbbbbbbbbbbbb..',
            '..bbbbbbbbbbbbb..',
            '.....eeee....e...',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
            '.................',
          ] },
        ],
        shut: [
          { at: [19, 31], rows: [
            '.................',
            '........b........',
            '.....bbbbbb......',
            '....bbbbbbbbb....',
            '...bbbbbbbbbbb...',
            '...bbbbbbbbbbb...',
            '..bbbbbbbbbbbbb..',
            '..bbbbbbbbbbbbb..',
            '...bbbbbbbbbbb...',
            '..b.bbbbbbbbbeb..',
            '..bb..bbbbb.ebb..',
            '..bbe......eebb..',
            '...bbb....ebbb...',
            '...bbbbbbbbbbb...',
            '....bbbbbbbbb....',
            '.....bbbbbbb.....',
            '.................',
            '.................',
          ] },
          { at: [64, 31], rows: [
            '.................',
            '........b........',
            '......bbbbbb.....',
            '....bbbbbbbbb....',
            '...bbbbbbbbbbb...',
            '...bbbbbbbbbbb...',
            '..bbbbbbbbbbbbb..',
            '..bbbbbbbbbbbbb..',
            '...bbbbbbbbbbb...',
            '..b.bbbbbbbbbeb..',
            '..bb..bbbbb.ebb..',
            '..bb.......eebb..',
            '...bbb....ebbb...',
            '...bbbbbbbbbbb...',
            '....bbbbbbbbb....',
            '.....bbbbbbb.....',
            '.................',
            '.................',
          ] },
        ],
      },
      breathSplit: 72,
    },
    // Facing your right, the backpack's face is copied back unmirrored, so "rappi" still reads.
    mirrorKeep: [[82, 41, 96, 78]],
  },
};
