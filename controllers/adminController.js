const adminController = {
    getAdminPage: async(req, res) => {
        try {
            res.render('admin');
        } catch (error) {
            console.log("Error fetching data for admin page:", error);
            res.status(500).send("Internal Server Error");
        };
    },
};

module.exports = adminController;