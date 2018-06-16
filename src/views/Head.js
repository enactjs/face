import kind from '@enact/core/kind';
import PropTypes from 'prop-types';
import React from 'react';
import {Layout, Cell} from '@enact/ui/Layout';

import Face from '../components/Face';

import css from './Head.less';

const Head = kind({
	name: 'Head',

	propTypes: {
		expression: PropTypes.object,
		soundSrc: PropTypes.string
	},

	styles: {
		css,
		className: 'head'
	},

	render: ({expression, soundSrc, ...rest}) => (
		<Layout orientation="vertical" align="center center" {...rest}>
			<Cell shrink className={css.headInner}>
				<Face expression={expression} soundSrc={soundSrc} />
			</Cell>
		</Layout>
	)
});

export default Head;
