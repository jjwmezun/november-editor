import { ByteBlock, CharItem, DecodedTextData, TextTrie } from "./types";

/* eslint max-len: "off" */
const trie: TextTrie = Object.freeze( {
	char: null,
	frequency: 10211,
	children: [
		{
			char: null,
			frequency: 4189,
			children: [
				{
					char: null,
					frequency: 1978,
					children: [
						{
							char: null,
							frequency: 966,
							children: [
								{
									char: `R`,
									frequency: 482,
									children: null,
									code: [
										0,
										0,
										0,
										0,
									],
								},
								{
									char: `I`,
									frequency: 484,
									children: null,
									code: [
										0,
										0,
										0,
										1,
									],
								},
							],
						},
						{
							char: null,
							frequency: 1012,
							children: [
								{
									char: `N`,
									frequency: 502,
									children: null,
									code: [
										0,
										0,
										1,
										0,
									],
								},
								{
									char: null,
									frequency: 510,
									children: [
										{
											char: null,
											frequency: 252,
											children: [
												{
													char: null,
													frequency: 125,
													children: [
														{
															char: `V`,
															frequency: 62,
															children: null,
															code: [
																0,
																0,
																1,
																1,
																0,
																0,
																0,
															],
														},
														{
															char: null,
															frequency: 63,
															children: [
																{
																	char: null,
																	frequency: 31,
																	children: [
																		{
																			char: `@`,
																			frequency: 15,
																			children: null,
																			code: [
																				0,
																				0,
																				1,
																				1,
																				0,
																				0,
																				1,
																				0,
																				0,
																			],
																		},
																		{
																			char: `\n`,
																			frequency: 16,
																			children: null,
																			code: [
																				0,
																				0,
																				1,
																				1,
																				0,
																				0,
																				1,
																				0,
																				1,
																			],
																		},
																	],
																},
																{
																	char: `1`,
																	frequency: 32,
																	children: null,
																	code: [
																		0,
																		0,
																		1,
																		1,
																		0,
																		0,
																		1,
																		1,
																	],
																},
															],
														},
													],
												},
												{
													char: `F`,
													frequency: 127,
													children: null,
													code: [
														0,
														0,
														1,
														1,
														0,
														1,
													],
												},
											],
										},
										{
											char: `D`,
											frequency: 258,
											children: null,
											code: [
												0,
												0,
												1,
												1,
												1,
											],
										},
									],
								},
							],
						},
					],
				},
				{
					char: null,
					frequency: 2211,
					children: [
						{
							char: null,
							frequency: 1067,
							children: [
								{
									char: null,
									frequency: 530,
									children: [
										{
											char: `TERMINAL`,
											frequency: 259,
											children: null,
											code: [
												0,
												1,
												0,
												0,
												0,
											],
										},
										{
											char: `C`,
											frequency: 271,
											children: null,
											code: [
												0,
												1,
												0,
												0,
												1,
											],
										},
									],
								},
								{
									char: `S`,
									frequency: 537,
									children: null,
									code: [
										0,
										1,
										0,
										1,
									],
								},
							],
						},
						{
							char: null,
							frequency: 1144,
							children: [
								{
									char: null,
									frequency: 564,
									children: [
										{
											char: null,
											frequency: 276,
											children: [
												{
													char: null,
													frequency: 135,
													children: [
														{
															char: null,
															frequency: 64,
															children: [
																{
																	char: `&`,
																	frequency: 32,
																	children: null,
																	code: [
																		0,
																		1,
																		1,
																		0,
																		0,
																		0,
																		0,
																		0,
																	],
																},
																{
																	char: null,
																	frequency: 32,
																	children: [
																		{
																			char: `X`,
																			frequency: 16,
																			children: null,
																			code: [
																				0,
																				1,
																				1,
																				0,
																				0,
																				0,
																				0,
																				1,
																				0,
																			],
																		},
																		{
																			char: null,
																			frequency: 16,
																			children: [
																				{
																					char: null,
																					frequency: 8,
																					children: [
																						{
																							char: `6`,
																							frequency: 4,
																							children: null,
																							code: [
																								0,
																								1,
																								1,
																								0,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								0,
																							],
																						},
																						{
																							char: `8`,
																							frequency: 4,
																							children: null,
																							code: [
																								0,
																								1,
																								1,
																								0,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								1,
																							],
																						},
																					],
																				},
																				{
																					char: null,
																					frequency: 8,
																					children: [
																						{
																							char: `—`,
																							frequency: 4,
																							children: null,
																							code: [
																								0,
																								1,
																								1,
																								0,
																								0,
																								0,
																								0,
																								1,
																								1,
																								1,
																								0,
																							],
																						},
																						{
																							char: null,
																							frequency: 4,
																							children: [
																								{
																									char: `7`,
																									frequency: 2,
																									children: null,
																									code: [
																										0,
																										1,
																										1,
																										0,
																										0,
																										0,
																										0,
																										1,
																										1,
																										1,
																										1,
																										0,
																									],
																								},
																								{
																									char: null,
																									frequency: 2,
																									children: [
																										{
																											char: `$`,
																											frequency: 1,
																											children: null,
																											code: [
																												0,
																												1,
																												1,
																												0,
																												0,
																												0,
																												0,
																												1,
																												1,
																												1,
																												1,
																												1,
																												0,
																											],
																										},
																										{
																											char: `™`,
																											frequency: 1,
																											children: null,
																											code: [
																												0,
																												1,
																												1,
																												0,
																												0,
																												0,
																												0,
																												1,
																												1,
																												1,
																												1,
																												1,
																												1,
																											],
																										},
																									],
																								},
																							],
																						},
																					],
																				},
																			],
																		},
																	],
																},
															],
														},
														{
															char: null,
															frequency: 71,
															children: [
																{
																	char: `-`,
																	frequency: 34,
																	children: null,
																	code: [
																		0,
																		1,
																		1,
																		0,
																		0,
																		0,
																		1,
																		0,
																	],
																},
																{
																	char: null,
																	frequency: 37,
																	children: [
																		{
																			char: `Z`,
																			frequency: 17,
																			children: null,
																			code: [
																				0,
																				1,
																				1,
																				0,
																				0,
																				0,
																				1,
																				1,
																				0,
																			],
																		},
																		{
																			char: `0`,
																			frequency: 20,
																			children: null,
																			code: [
																				0,
																				1,
																				1,
																				0,
																				0,
																				0,
																				1,
																				1,
																				1,
																			],
																		},
																	],
																},
															],
														},
													],
												},
												{
													char: `B`,
													frequency: 141,
													children: null,
													code: [
														0,
														1,
														1,
														0,
														0,
														1,
													],
												},
											],
										},
										{
											char: `U`,
											frequency: 288,
											children: null,
											code: [
												0,
												1,
												1,
												0,
												1,
											],
										},
									],
								},
								{
									char: `A`,
									frequency: 580,
									children: null,
									code: [
										0,
										1,
										1,
										1,
									],
								},
							],
						},
					],
				},
			],
		},
		{
			char: null,
			frequency: 6022,
			children: [
				{
					char: null,
					frequency: 2783,
					children: [
						{
							char: null,
							frequency: 1330,
							children: [
								{
									char: `T`,
									frequency: 663,
									children: null,
									code: [
										1,
										0,
										0,
										0,
									],
								},
								{
									char: `O`,
									frequency: 667,
									children: null,
									code: [
										1,
										0,
										0,
										1,
									],
								},
							],
						},
						{
							char: ` `,
							frequency: 1453,
							children: null,
							code: [
								1,
								0,
								1,
							],
						},
					],
				},
				{
					char: null,
					frequency: 3239,
					children: [
						{
							char: null,
							frequency: 1491,
							children: [
								{
									char: null,
									frequency: 694,
									children: [
										{
											char: null,
											frequency: 322,
											children: [
												{
													char: `W`,
													frequency: 156,
													children: null,
													code: [
														1,
														1,
														0,
														0,
														0,
														0,
													],
												},
												{
													char: null,
													frequency: 166,
													children: [
														{
															char: `.`,
															frequency: 83,
															children: null,
															code: [
																1,
																1,
																0,
																0,
																0,
																1,
																0,
															],
														},
														{
															char: null,
															frequency: 83,
															children: [
																{
																	char: null,
																	frequency: 40,
																	children: [
																		{
																			char: null,
																			frequency: 20,
																			children: [
																				{
																					char: `2`,
																					frequency: 10,
																					children: null,
																					code: [
																						1,
																						1,
																						0,
																						0,
																						0,
																						1,
																						1,
																						0,
																						0,
																						0,
																					],
																				},
																				{
																					char: null,
																					frequency: 10,
																					children: [
																						{
																							char: `3`,
																							frequency: 5,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								0,
																								1,
																								0,
																							],
																						},
																						{
																							char: `9`,
																							frequency: 5,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								0,
																								1,
																								1,
																							],
																						},
																					],
																				},
																			],
																		},
																		{
																			char: null,
																			frequency: 20,
																			children: [
																				{
																					char: null,
																					frequency: 10,
																					children: [
																						{
																							char: `Q`,
																							frequency: 5,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								1,
																								0,
																								0,
																							],
																						},
																						{
																							char: `…`,
																							frequency: 5,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								1,
																								0,
																								1,
																							],
																						},
																					],
																				},
																				{
																					char: null,
																					frequency: 10,
																					children: [
																						{
																							char: `“`,
																							frequency: 5,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								1,
																								1,
																								0,
																							],
																						},
																						{
																							char: `”`,
																							frequency: 5,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								0,
																								1,
																								1,
																								0,
																								1,
																								1,
																								1,
																							],
																						},
																					],
																				},
																			],
																		},
																	],
																},
																{
																	char: `,`,
																	frequency: 43,
																	children: null,
																	code: [
																		1,
																		1,
																		0,
																		0,
																		0,
																		1,
																		1,
																		1,
																	],
																},
															],
														},
													],
												},
											],
										},
										{
											char: null,
											frequency: 372,
											children: [
												{
													char: `G`,
													frequency: 185,
													children: null,
													code: [
														1,
														1,
														0,
														0,
														1,
														0,
													],
												},
												{
													char: null,
													frequency: 187,
													children: [
														{
															char: null,
															frequency: 92,
															children: [
																{
																	char: `¡`,
																	frequency: 46,
																	children: null,
																	code: [
																		1,
																		1,
																		0,
																		0,
																		1,
																		1,
																		0,
																		0,
																	],
																},
																{
																	char: `!`,
																	frequency: 46,
																	children: null,
																	code: [
																		1,
																		1,
																		0,
																		0,
																		1,
																		1,
																		0,
																		1,
																	],
																},
															],
														},
														{
															char: null,
															frequency: 95,
															children: [
																{
																	char: null,
																	frequency: 46,
																	children: [
																		{
																			char: null,
																			frequency: 22,
																			children: [
																				{
																					char: `5`,
																					frequency: 11,
																					children: null,
																					code: [
																						1,
																						1,
																						0,
																						0,
																						1,
																						1,
																						1,
																						0,
																						0,
																						0,
																					],
																				},
																				{
																					char: null,
																					frequency: 11,
																					children: [
																						{
																							char: null,
																							frequency: 5,
																							children: [
																								{
																									char: null,
																									frequency: 2,
																									children: [
																										{
																											char: `+`,
																											frequency: 1,
																											children: null,
																											code: [
																												1,
																												1,
																												0,
																												0,
																												1,
																												1,
																												1,
																												0,
																												0,
																												1,
																												0,
																												0,
																												0,
																											],
																										},
																										{
																											char: `=`,
																											frequency: 1,
																											children: null,
																											code: [
																												1,
																												1,
																												0,
																												0,
																												1,
																												1,
																												1,
																												0,
																												0,
																												1,
																												0,
																												0,
																												1,
																											],
																										},
																									],
																								},
																								{
																									char: `4`,
																									frequency: 3,
																									children: null,
																									code: [
																										1,
																										1,
																										0,
																										0,
																										1,
																										1,
																										1,
																										0,
																										0,
																										1,
																										0,
																										1,
																									],
																								},
																							],
																						},
																						{
																							char: `%`,
																							frequency: 6,
																							children: null,
																							code: [
																								1,
																								1,
																								0,
																								0,
																								1,
																								1,
																								1,
																								0,
																								0,
																								1,
																								1,
																							],
																						},
																					],
																				},
																			],
																		},
																		{
																			char: `J`,
																			frequency: 24,
																			children: null,
																			code: [
																				1,
																				1,
																				0,
																				0,
																				1,
																				1,
																				1,
																				0,
																				1,
																			],
																		},
																	],
																},
																{
																	char: null,
																	frequency: 49,
																	children: [
																		{
																			char: null,
																			frequency: 24,
																			children: [
																				{
																					char: `#`,
																					frequency: 12,
																					children: null,
																					code: [
																						1,
																						1,
																						0,
																						0,
																						1,
																						1,
																						1,
																						1,
																						0,
																						0,
																					],
																				},
																				{
																					char: null,
																					frequency: 12,
																					children: [
																						{
																							char: null,
																							frequency: 6,
																							children: [
																								{
																									char: `/`,
																									frequency: 3,
																									children: null,
																									code: [
																										1,
																										1,
																										0,
																										0,
																										1,
																										1,
																										1,
																										1,
																										0,
																										1,
																										0,
																										0,
																									],
																								},
																								{
																									char: `₧`,
																									frequency: 3,
																									children: null,
																									code: [
																										1,
																										1,
																										0,
																										0,
																										1,
																										1,
																										1,
																										1,
																										0,
																										1,
																										0,
																										1,
																									],
																								},
																							],
																						},
																						{
																							char: null,
																							frequency: 6,
																							children: [
																								{
																									char: `¿`,
																									frequency: 3,
																									children: null,
																									code: [
																										1,
																										1,
																										0,
																										0,
																										1,
																										1,
																										1,
																										1,
																										0,
																										1,
																										1,
																										0,
																									],
																								},
																								{
																									char: `?`,
																									frequency: 3,
																									children: null,
																									code: [
																										1,
																										1,
																										0,
																										0,
																										1,
																										1,
																										1,
																										1,
																										0,
																										1,
																										1,
																										1,
																									],
																								},
																							],
																						},
																					],
																				},
																			],
																		},
																		{
																			char: `:`,
																			frequency: 25,
																			children: null,
																			code: [
																				1,
																				1,
																				0,
																				0,
																				1,
																				1,
																				1,
																				1,
																				1,
																			],
																		},
																	],
																},
															],
														},
													],
												},
											],
										},
									],
								},
								{
									char: null,
									frequency: 797,
									children: [
										{
											char: `L`,
											frequency: 387,
											children: null,
											code: [
												1,
												1,
												0,
												1,
												0,
											],
										},
										{
											char: `H`,
											frequency: 410,
											children: null,
											code: [
												1,
												1,
												0,
												1,
												1,
											],
										},
									],
								},
							],
						},
						{
							char: null,
							frequency: 1748,
							children: [
								{
									char: null,
									frequency: 846,
									children: [
										{
											char: null,
											frequency: 413,
											children: [
												{
													char: `P`,
													frequency: 206,
													children: null,
													code: [
														1,
														1,
														1,
														0,
														0,
														0,
													],
												},
												{
													char: `Y`,
													frequency: 207,
													children: null,
													code: [
														1,
														1,
														1,
														0,
														0,
														1,
													],
												},
											],
										},
										{
											char: null,
											frequency: 433,
											children: [
												{
													char: `M`,
													frequency: 212,
													children: null,
													code: [
														1,
														1,
														1,
														0,
														1,
														0,
													],
												},
												{
													char: null,
													frequency: 221,
													children: [
														{
															char: `K`,
															frequency: 103,
															children: null,
															code: [
																1,
																1,
																1,
																0,
																1,
																1,
																0,
															],
														},
														{
															char: `’`,
															frequency: 118,
															children: null,
															code: [
																1,
																1,
																1,
																0,
																1,
																1,
																1,
															],
														},
													],
												},
											],
										},
									],
								},
								{
									char: `E`,
									frequency: 902,
									children: null,
									code: [
										1,
										1,
										1,
										1,
									],
								},
							],
						},
					],
				},
			],
		},
	],
} );

const generateCodeList = ( trie: TextTrie ): CharItem[] => {
	if ( trie.children ) {
		return trie.children.map( child => generateCodeList( child ) ).flat( 1 );
	} else {
		if ( trie.char === null || trie.code === undefined ) {
			throw new Error( `Trie node has no code.` );
		}
		return [ { char: trie.char, code: trie.code.join( `` ) } ];
	}
};

const codeList: CharItem[] = generateCodeList( trie )
	.sort( ( a, b ) => a.code.length - b.code.length );

const codeMap = {};
codeList.forEach( ( { char, code } ) => {
	codeMap[ char ] = code;
} );

export const encodeText = ( text: string ): ByteBlock[] => {
	const list: string[] = [ ...text.toUpperCase(), `TERMINAL` ].map( char => codeMap[ char ].split( `` ) ).flat( Infinity );

	// Pad out bits to fill bytes.
	while ( list.length % 8 !== 0 ) {
		list.push( `0` );
	}

	const byteList: ByteBlock[] = [];
	while ( list.length ) {
		byteList.push( {
			type: `Uint8`,
			value: parseInt( list.splice( 0, 8 ).join( `` ), 2 ),
		} );
	}

	return byteList;
};

export const decodeText = ( bytes: Uint8Array ): DecodedTextData => {
	let bytesUsed = 1;
	const decodePiece = ( innerTrie, bitList ) => {
		if ( innerTrie?.children === undefined ) {
			throw new Error( `No character.` );
		}
		if ( innerTrie?.children !== null ) {
			if ( bitList.head.length === 0 ) {
				bitList.head = bitList.tail.shift().toString( 2 ).padStart( 8, `0` ).split( `` );
				++bytesUsed;
			}
			const n = bitList.head.shift();
			return decodePiece( innerTrie.children[ n ], bitList );
		} else {
			if ( innerTrie.char === `TERMINAL` ) {
				return ``;
			} else {
				return innerTrie.char + decodePiece( trie, bitList );
			}
		}
	};

	if ( bytes.length < 1 ) {
		throw new Error( `No bytes to decode.` );
	}

	const bits = {
		head: bytes[ 0 ].toString( 2 ).padStart( 8, `0` ).split( `` ),
		tail: [ ...bytes.slice( 1 ) ],
	};
	const text = decodePiece( trie, bits );
	return {
		text,
		bytesUsed,
		remainingBytes: new Uint8Array( bytes.slice( bytesUsed ) ),
	};
};

export const testCharacters = ( text: string ): boolean => {
	return text.toUpperCase().split( `` ).every( char => codeMap[ char ] !== undefined );
};
