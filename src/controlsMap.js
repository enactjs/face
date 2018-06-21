/*
 * Map the button name constants to their related inputs
 *
 * Each "configuration" is tied to the position of the lights in the center of the XBOX style controller.
 *
 * A configuration has a name "top", "left", etc. Each config has an axis key and a buttons key,
 * which relate to the floating/numeric control values and boolean control values, respectively.
 */

const
	// Axis Name Constants
	LS_HORIZ  = 'LS_HORIZ',
	LS_VERT   = 'LS_VERT',
	RS_HORIZ  = 'RS_HORIZ',
	RS_VERT   = 'RS_VERT',
	DP_HORIZ  = 'DP_HORIZ',
	DP_VERT   = 'DP_VERT',
	R_TRIGGER = 'R_TRIGGER',
	L_TRIGGER = 'L_TRIGGER',

	// Button Name Constants
	A         = 'A',
	B         = 'B',
	X         = 'X',
	Y         = 'Y',
	L_BUMPER  = 'L_BUMPER',
	R_BUMPER  = 'R_BUMPER',
	BACK      = 'BACK',
	START     = 'START'
;

// Exportable button names hash
const buttonNames = {
	LS_HORIZ,
	LS_VERT,
	RS_HORIZ,
	RS_VERT,
	DP_HORIZ,
	DP_VERT,
	R_TRIGGER,
	L_TRIGGER,
	A,
	B,
	X,
	Y,
	L_BUMPER,
	R_BUMPER,
	BACK,
	START
};

export default {
	// Controller Configurations

	// Top 2 lights on controller
	top: {
		axis: {
			0: LS_HORIZ,
			1: LS_VERT,
			2: L_TRIGGER,
			3: RS_HORIZ,
			4: RS_VERT,
			5: R_TRIGGER,
			6: DP_HORIZ,
			7: DP_VERT
		},
		buttons: {
			0: A,
			1: B,
			2: X,
			3: Y,
			4: L_BUMPER,
			5: R_BUMPER,
			6: BACK,
			7: START,
			8: '8',
			9: '9',
			10: '10',
			11: '11',
			12: '12',
			13: '13',
			14: '14'
		}
	},

	// Left 2 lights on controller
	left: {
		axis: {
			0: LS_HORIZ,
			1: LS_VERT,
			2: RS_HORIZ,
			3: RS_VERT,
			4: DP_HORIZ,
			5: DP_VERT,
			6: '6',
			7: '7'
		},
		buttons: {
			0: Y,
			1: B,
			2: A,
			3: X,
			4: L_BUMPER,
			5: R_BUMPER,
			6: L_TRIGGER,
			7: R_TRIGGER,
			8: BACK,
			9: START,
			10: '10',
			11: '11',
			12: '12',
			13: '13',
			14: '14'
		}
	},

	// Bottom 2 lights on controller
	bottom: {
		axis: {
			0: LS_HORIZ,
			1: LS_VERT,
			2: RS_HORIZ,
			3: RS_VERT,
			4: R_TRIGGER,
			5: L_TRIGGER,
			6: DP_HORIZ,
			7: DP_VERT
		},
		buttons: {
			0: A,
			1: B,
			2: '2',
			3: X,
			4: Y,
			5: '5',
			6: L_BUMPER,
			7: R_BUMPER,
			8: L_TRIGGER,
			9: R_TRIGGER,
			10: BACK,
			11: START,
			12: '12',
			13: '13',
			14: '14'
		}
	}
};
export {
	buttonNames
};
