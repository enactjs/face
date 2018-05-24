import kind from '@enact/core/kind';
import PropTypes from 'prop-types';
import React from 'react';
import {Layout, Cell} from '@enact/ui/Layout';

import Face from '../components/Face';

import css from './Head.less';

const Head = kind({
	name: 'Head',

	propTypes: {
		expression: PropTypes.object
	},

	styles: {
		css,
		className: 'head'
	},

	render: ({expression, ...rest}) => (
		<Layout orientation="vertical" align="center center" {...rest}>
			<Cell shrink>
				<Face expression={expression} />
			</Cell>
		</Layout>
	)
});

export default Head;
