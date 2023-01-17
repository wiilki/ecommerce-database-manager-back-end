const router = require('express').Router();
const { Category, Product } = require('../../models');

// The `/api/categories` endpoint

router.get('/', async (req, res) => {
  // find all categories
  try {
    const seedCategories = await Category.findAll({ include: [{ model: Product }] });
    res.status(200).json(seedCategories);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get('/:id', async (req, res) => {
  // find one category by its `id` value
  try {
    const seedCategories = await Category.findByPk(req.params.id, { include: [{ model: Product }] });

    if (!seedCategories) {
      res.status(404).json({ message: 'No category found with that id!' });
      return;
    }

    res.status(200).json(seedCategories);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post('/', async (req, res) => {
  // create a new category
  try {
    const postCategories = await Category.create(req.body);
    res.status(200).json(postCategories);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put('/:id', async (req, res) => {
  // update a category by its `id` value
  try {
    const putCategories = await Category.update({
      id: req.params.id,
      category_name: req.body.category_name
    }, {
      where: {
        id: req.params.id
      }
    });
    if (!putCategories[0]) {
      res.status(404).json({ message: "No category found with that id!" });
    }
    res.status(200).json(putCategories);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.delete('/:id', async (req, res) => {
  // delete a category by its `id` value
  try {
    const seedCategories = await Category.destroy({ where: { id: req.params.id } });

    if (!seedCategories) {
      res.status(404).json({ message: 'No category found with that id!' });
      return;
    }

    res.status(200).json(seedCategories);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
