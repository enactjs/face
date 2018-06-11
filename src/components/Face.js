import PropTypes from 'prop-types';
import React from 'react';
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

const Face = kind({
	name: 'Face',

	propTypes: {
		expression: PropTypes.object
	},

	styles: {
		css,
		className: 'face'
	},

	computed: {
		className: ({expression, styler}) => styler.append(expression)
	},

	// eslint-disable-next-line
	render: ({styler, ...rest}) => {
		delete rest.expression;
		return (
			<Layout {...rest}>
				<Cell size="25%" className={styler.join('eyeSocket', 'left')}><Eye /></Cell>
				<Cell size="25%" className={styler.join('eyeSocket', 'right')}><Eye /></Cell>
			</Layout>
		);
	}
});

export default Face;
