export default Object.freeze([
    {
        name: `Reach Keycane`,
        exportData: [
        ],
    },
    {
        name: `Collect ₧`,
        options: [
            {
                slug: `amount`,
                title: `Amount`,
                type: `number`,
                default: 10000,
                atts: {
                    min: 1,
                    max: 99999,
                },
            }
        ],
        exportData: [
            { type: `Uint32`, data: `amount`, },
        ],
    },
]);