const { Game, GameNode, Colors, Shapes } = require(process.env.SQUISH_PATH);

class TestGame extends Game {
    static metadata() {
        return {
            aspectRatio: {x: 16, y: 9},
            author: 'Joseph Garcia',
            thumbnail: 'f103961541614b68c503a9ae2fd4cc47',
            squishVersion: '1005',
            tickRate: 10
        };
    }

    tick() {
        // no op
    }

    constructor() {
        super();

        const baseColor = Colors.randomColor();
        this.base = new GameNode.Shape({
            shapeType: Shapes.POLYGON,
            coordinates2d: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
                [0, 0]
            ],
            fill: baseColor,
            onClick: this.handleLayerClick
        });

    }

    handleNewPlayer({ playerId, info, settings }) {
    }

    handlePlayerDisconnect() {
    }

    handleLayerClick() {
        const newColor = Colors.randomColor();
        this.color = newColor;
        this.fill = newColor;
    }

    getLayers() {
        return [
            {
                root: this.base      
            }
        ];
    }
}

module.exports = TestGame;
