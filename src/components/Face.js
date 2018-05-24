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

	styles: {
		css,
		className: 'face'
	},

	computed: {
		className: ({expression, styler}) => styler.append(expression)
	},

	render: ({styler, ...rest}) => {
		delete rest.expression;
		return (
			<Layout {...rest}>
				<Cell size="40%" className={styler.join('eyeSocket', 'left')}><Eye/></Cell>
				<Cell size="40%" className={styler.join('eyeSocket', 'right')}><Eye/></Cell>
			</Layout>
		);
	}
});

export default Face;
