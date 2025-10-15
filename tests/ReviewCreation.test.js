// ✅ Mock โมดูลก่อน import controller
jest.mock('../models/gameModels', () => ({
    findGameById: jest.fn(),
    findReviewByGameAndUser: jest.fn(),
    createReview: jest.fn(),
}));

const gameModels = require('../models/gameModels');
const gameController = require('../controllers/gameControllers');

describe('🎯 postCreateReview (Review Creation)', () => {
    let req, res, consoleErrorSpy;

    beforeEach(() => {
        req = {
            params: { id: 1 },
            body: { comment: 'Great game!' },
            user: { User_id: 10 }
        };

        res = {
            redirect: jest.fn(),
            render: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };

        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --------------------------
    // ✅ R1: Create review success
    // --------------------------
    test('R1: should create a review successfully and redirect', async () => {
        gameModels.createReview.mockResolvedValue(true);

        await gameController.postCreateReview(req, res);

        expect(gameModels.createReview).toHaveBeenCalledWith(
            expect.objectContaining({
                game_id: req.params.id,
                user_id: req.user.User_id,
                comment: req.body.comment
            })
        );
        expect(res.redirect).toHaveBeenCalledWith(`/game/view/${req.params.id}`);
    });

    // --------------------------
    // ✅ E1: Not logged in
    // --------------------------
    test('E1: should render login-required error if not logged in', async () => {
        req.user = null;

        await gameController.postCreateReview(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(
            expect.stringMatching(/unauthorized|login/i)
        );
    });

    // --------------------------
    // ✅ E2: DB error handling
    // --------------------------
    test('E2: should handle DB error gracefully', async () => {
        gameModels.createReview.mockRejectedValue(new Error('DB error'));

        await gameController.postCreateReview(req, res);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.stringMatching(/internal server error/i)
        );
    });
});
