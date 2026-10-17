import { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Save, Eye, ArrowLeft, GitBranch, Code2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Input, Select, Textarea } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { templatesApi } from '@api/templates.api';
import { LANGUAGES, DIFFICULTIES, ROUTES } from '@constants';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const CreateTemplate = () => {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'github'
  const [code, setCode] = useState('// Paste or write your code here\n');
  const [preview, setPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { language: 'javascript', difficulty: 'INTERMEDIATE', isPublic: true },
  });

  const {
    register: registerGithub,
    handleSubmit: handleSubmitGithub,
    formState: { errors: errorsGithub }
  } = useForm({
    defaultValues: { difficulty: 'INTERMEDIATE', isPublic: true },
  });

  const selectedLang = watch('language');

  const onSubmitManual = async (data) => {
    if (!code.trim() || code === '// Paste or write your code here\n') {
      toast.error('Please add some code to the template');
      return;
    }
    setIsLoading(true);
    try {
      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await templatesApi.create({ ...data, tags: tagsArray, code });
      toast.success('Template created! 🎉');
      navigate(ROUTES.TEMPLATES);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitGithub = async (data) => {
    setIsLoading(true);
    try {
      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await templatesApi.importFromGitHub({ ...data, tags: tagsArray });
      toast.success('GitHub file imported successfully! 🚀');
      navigate(ROUTES.TEMPLATES);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to import GitHub file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-2 text-muted hover:text-text-primary transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Create Template</h1>
              <p className="text-text-secondary text-sm mt-0.5">Build a custom coding challenge or import from GitHub</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-surface-2/80 rounded-xl border border-border/50 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'manual'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-text-primary'
              }`}
            >
              <Code2 size={14} /> Manual Editor
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'github'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-text-primary'
              }`}
            >
              <GitBranch size={14} /> GitHub Import
            </button>
          </div>
        </div>

        {/* Mode 1: Manual Code Editor */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit(onSubmitManual)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <div className="space-y-5">
                <div className="glass-card p-5 space-y-4">
                  <h3 className="font-semibold text-text-primary text-sm">Template Details</h3>
                  <Input label="Title" placeholder="e.g., Binary Search Algorithm" error={errors.title?.message} {...register('title', { required: 'Title is required' })} />
                  <Select label="Language" options={LANGUAGES} {...register('language')} />
                  <Select label="Difficulty" options={DIFFICULTIES} {...register('difficulty')} />
                  <Input label="Tags (comma separated)" placeholder="algorithms, sorting, java" {...register('tags')} hint="Helps others find your template" />

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('isPublic')} className="w-4 h-4 accent-primary rounded" defaultChecked />
                    <div>
                      <span className="text-sm font-medium text-text-primary">Make Public</span>
                      <p className="text-xs text-muted">Others can practice this template</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 border border-border"
                    onClick={() => setPreview(!preview)}
                  >
                    <Eye size={16} /> {preview ? 'Edit' : 'Preview'}
                  </Button>
                  <Button type="submit" className="flex-1 font-bold" isLoading={isLoading}>
                    <Save size={16} /> Save
                  </Button>
                </div>
              </div>

              {/* Editor */}
              <div className="lg:col-span-2">
                <div className="glass-card overflow-hidden h-[600px] flex flex-col">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-error/50" />
                      <div className="w-3 h-3 rounded-full bg-warning/50" />
                      <div className="w-3 h-3 rounded-full bg-success/50" />
                    </div>
                    <Badge variant="primary" size="sm">{LANGUAGES.find(l => l.value === selectedLang)?.label || selectedLang}</Badge>
                    <span className="text-xs text-muted">{code.split('\n').length} lines</span>
                  </div>

                  {preview ? (
                    <div className="flex-1 p-6 font-mono text-sm text-muted overflow-auto bg-background/50 leading-loose">
                      {code}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-muted text-sm">Loading editor...</div></div>}>
                        <MonacoEditor
                          height="100%"
                          language={selectedLang}
                          value={code}
                          onChange={(val) => setCode(val || '')}
                          theme="vs-dark"
                          options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            fontFamily: 'JetBrains Mono, Fira Code, monospace',
                            padding: { top: 16, bottom: 16 },
                            roundedSelection: true,
                            cursorBlinking: 'smooth',
                            bracketPairColorization: { enabled: true },
                          }}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Mode 2: GitHub Import */}
        {activeTab === 'github' && (
          <form onSubmit={handleSubmitGithub(onSubmitGithub)} className="max-w-2xl mx-auto">
            <div className="glass-card p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <GitBranch size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text-primary">Import from GitHub</h3>
                  <p className="text-xs text-muted">Paste any public raw file or Gist URL to create a typing template</p>
                </div>
              </div>

              <Input
                label="GitHub Raw / Gist URL"
                placeholder="https://raw.githubusercontent.com/user/repo/main/App.java"
                error={errorsGithub.url?.message}
                {...registerGithub('url', { required: 'GitHub URL is required' })}
                hint="Supports GitHub blob URLs, raw.githubusercontent.com, and Gists"
              />

              <Input
                label="Title (Optional override)"
                placeholder="e.g., Spring Boot Config"
                {...registerGithub('title')}
              />

              <Select
                label="Difficulty"
                options={DIFFICULTIES}
                {...registerGithub('difficulty')}
              />

              <Input
                label="Tags (comma separated)"
                placeholder="github, java, spring"
                {...registerGithub('tags')}
              />

              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <input type="checkbox" {...registerGithub('isPublic')} className="w-4 h-4 accent-primary rounded" defaultChecked />
                <div>
                  <span className="text-sm font-medium text-text-primary">Make Public</span>
                  <p className="text-xs text-muted">Allow other community members to practice this template</p>
                </div>
              </label>

              <Button type="submit" variant="primary" size="lg" className="w-full mt-4 font-bold" isLoading={isLoading}>
                <Download size={18} /> Import & Create Template
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default CreateTemplate;
