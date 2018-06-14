import PropTypes from 'prop-types';
import React from 'react';
import clamp from 'ramda/src/clamp';
import ReactAudioPlayer from 'react-audio-player';
import kind from '@enact/core/kind';
import {Layout, Cell} from '@enact/ui/Layout';

import css from './Face.less';

const Eye = kind({
	name: 'Eye',

	styles: {
		css,
		className: 'eye'
	},

	// eslint-disable-next-line
	render: ({styler, ...rest}) => (
		<div {...rest}>
			<div className={styler.join('lid', 'upper')} />
			<div className={css.ball} />
			<div className={styler.join('lid', 'lower')} />
		</div>
	)
});

const mouthPercentToAbsolute = (percent) => (clamp(0, 1, percent) * 192);

const Mouth = kind({
	name: 'Mouth',

	propTypes: {
		lowerLip: PropTypes.number,
		lowerLipResting: PropTypes.number,
		upperLip: PropTypes.number,
		upperLipResting: PropTypes.number
	},

	defaultProps: {
		lowerLipResting: 0.75,
		upperLipResting: 0.6
	},

	styles: {
		css,
		className: 'mouth'
	},

	computed: {
		lowerLipTip: ({lowerLip, lowerLipResting}) => mouthPercentToAbsolute(lowerLip || lowerLipResting),
		upperLipTip: ({upperLip, upperLipResting}) => mouthPercentToAbsolute(upperLip || upperLipResting)
	},

	// <!-- Generator: Adobe Illustrator 22.1.0, SVG Export Plug-In  -->
	// eslint-disable-next-line
	render: ({lowerLipTip, upperLipTip, styler, ...rest}) => {
		delete rest.lowerLip;
		delete rest.lowerLipResting;
		delete rest.upperLip;
		delete rest.upperLipResting;
		return (
			<svg version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				// xmlns:xlink="http://www.w3.org/1999/xlink"
				// xmlns:a="http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/"
				x="0px"
				y="0px"
				width="100%"
				height="100%"
				preserveAspectRatio="none" // scale (distort) with the size of the container
				// width="352px"
				// height="192px"
				viewBox="0 0 352 192"
				//style={{'enable-background': 'new 0 0 352 192'}}
				xmlSpace="preserve"
				{...rest}>
			<g>
				<polygon className={css.throat} points="0,96 176,0 352,96 176,192"/>
				<polygon className={styler.join('lip', 'upper')} points={`0,96 176,0 352,96 176,${upperLipTip}`}/>
				<polygon className={styler.join('lip', 'lower')} points={`0,96 176,192 352,96 176,${lowerLipTip}`}/>
				<polygon className={css.lipShading} points={`176,0 352,96 176,${upperLipTip}`} />
				<polygon className={css.lipShading} points={`176,192 352,96 176,${lowerLipTip}`} />
			</g>
			</svg>
		);
	}
});

const Face = kind({
	name: 'Face',

	propTypes: {
		expression: PropTypes.object,
		soundSrc: PropTypes.string
	},

	styles: {
		css,
		className: 'face'
	},

	computed: {
		className: ({expression, styler}) => styler.append(expression),
		upperLip: ({expression}) => {
			if (expression.attackMode) return 0.2;
			if (expression.happy) return 0.7;
			if (expression.sad) return 0.2;
		},
		lowerLip: ({expression}) => {
			if (expression.attackMode) return 0.8;
			if (expression.happy) return 0.8;
			if (expression.sad) return 0.3;
		}
	},

	// eslint-disable-next-line
	render: ({lowerLip, soundSrc, upperLip, styler, ...rest}) => {
		delete rest.expression;
		return (
			<Layout {...rest}>
				<Cell shrink className={styler.join('cheek', 'left')} />
				<Cell size="25%" className={styler.join('eyeSocket', 'left')}><Eye /></Cell>
				<Cell shrink className={css.lowerFace}>
					<ReactAudioPlayer
						src={soundSrc}
						autoPlay
						// controls
					/>
					<Mouth lowerLip={lowerLip} upperLip={upperLip} />
				</Cell>
				<Cell size="25%" className={styler.join('eyeSocket', 'right')}><Eye /></Cell>
				<Cell shrink className={styler.join('cheek', 'right')} />
				<Cell shrink className={styler.join('droplet', 'right')} />
			</Layout>
		);
	}
});

export default Face;
