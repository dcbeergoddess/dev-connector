const express = require('express');
const request = require('request');
const config = require('config');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Post');

// @route   GET api/profile/me
// @desc    Get current users profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // find user by user ref id and populate the name and avatar
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      'user',
      ['name', 'avatar']
    );
    // if no profile then send error
    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }
    // if profile exists --> send it along
    res.json(profile);
  } catch (err) {
    console.error(err.msg);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profile/
// @desc    Create or Update user profile
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('status', 'Status is required').not().isEmpty(),
      check('skills', 'Skills is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // DESTRUCTURE ALL THE FIELDS WE WANT TO PULL OUT from req.body
    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body;
    // BUILD PROFILE OBJECTS
    const profileFields = {};
    // get from token
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(',').map(skill => skill.trim());
    }
    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (instagram) profileFields.social.instagram = instagram;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      if (profile) {
        //UPDATE
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }
      // Create Profile (if does not exist yet)
      profile = new Profile(profileFields);

      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/profile/
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (err) {
    console.error(error.msg);
    res.status(500).res.send('Server Error');
  }
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.find({ user: req.params.user_id }).populate(
      'user',
      ['name', 'avatar']
    );

    if (!profile) return res.status(400).json({ msg: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err.msg);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).res.send('Server Error');
  }
});

// @route   DELETE api/profile/
// @desc    Delete profile, user & posts
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    // REMOVE USER POSTS
    await Post.deleteMany({ user: req.user.id });
    // Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    // Remove User
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.msg);
    res.status(500).res.send('Server Error');
  }
});

// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  Private
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('company', 'Company is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // destructure from req.body
    const { title, company, location, from, to, current, description } =
      req.body;
    // create new Experience object with the data that the user submits
    const newExp = {
      // title: title (below is shorthand of this)
      title,
      company,
      location,
      from,
      to,
      current,
      description
    };
    // Fetch Profile to add the experience to
    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    // Get remove index
    const removeIndex = profile.experience
      .map(item => item.id)
      .indexOf(req.params.exp_id);
    // removed item based on index that matched
    profile.experience.splice(removeIndex, 1);
    // await save
    await profile.save();
    // and send back response
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profile/education
// @desc    Add profile education
// @access  Private
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'School is required').not().isEmpty(),
      check('degree', 'Degree is required').not().isEmpty(),
      check('fieldofstudy', 'Field of Study is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // destructure from req.body
    const { school, degree, fieldofstudy, from, to, current, description } =
      req.body;
    // create new Experience object with the data that the user submits
    const newEdu = {
      // title: title (below is shorthand of this)
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    };
    // Fetch Profile to add the experience to
    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEdu);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/profile/education/:edu_id
// @desc    Delete education from profile
// @access  Private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    // Get remove index
    const removeIndex = profile.education
      .map(item => item.id)
      .indexOf(req.params.edu_id);
    // removed item based on index that matched
    profile.education.splice(removeIndex, 1);
    // await save
    await profile.save();
    // and send back response
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/profile/github/:username
// @desc    Get user repos from GitHub
// @access  Public
router.get('/github/:username', (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        'githubClientId'
      )}&client_secret=${config.get('githubSecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js' }
    };

    request(options, (error, response, body) => {
      if (error) console.error(error);

      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: 'No GitHub profile found' });
      }

      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
