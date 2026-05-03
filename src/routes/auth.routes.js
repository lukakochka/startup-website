import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { issueToken } from '../middleware/auth.js';

const router = Router();

// ─── Upsert helper ───────────────────────────────────────────────────────────

async function upsertUser({ email, name, avatar, provider, providerId }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, avatar, provider, providerId },
    create: { email, name, avatar, provider, providerId },
  });
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.APP_URL}/api/auth/google/callback`,
      },
      async (_at, _rt, profile, done) => {
        try {
          const user = await upsertUser({
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos[0]?.value,
            provider: 'google',
            providerId: profile.id,
          });
          done(null, user);
        } catch (err) { done(err); }
      }
    )
  );
}

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

if (process.env.GITHUB_CLIENT_ID) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.APP_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      async (_at, _rt, profile, done) => {
        try {
          const user = await upsertUser({
            email: profile.emails?.[0]?.value ?? `${profile.username}@github.noemail`,
            name: profile.displayName || profile.username,
            avatar: profile.photos[0]?.value,
            provider: 'github',
            providerId: String(profile.id),
          });
          done(null, user);
        } catch (err) { done(err); }
      }
    )
  );
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await prisma.user.findUnique({ where: { id } })); }
  catch (err) { done(err); }
});

// ─── Route helpers ───────────────────────────────────────────────────────────

function oauthCallback(req, res) {
  const token = issueToken(req.user);
  // Fragment (#) keeps token out of server logs and referer headers
  res.redirect(`${process.env.APP_URL}/#token=${token}`);
}

// ─── Google routes ───────────────────────────────────────────────────────────

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/#error=auth_failed' }),
  oauthCallback
);

// ─── GitHub routes ───────────────────────────────────────────────────────────

router.get('/github', passport.authenticate('github', { session: false }));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/#error=auth_failed' }),
  oauthCallback
);

// ─── Current user ─────────────────────────────────────────────────────────────

router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.json({ user: null });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.json({ user: null });
  }
});

export default router;
