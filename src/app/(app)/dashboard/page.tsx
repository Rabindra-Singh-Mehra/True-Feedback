'use client';

import { MessageCard } from '@/components/MessageCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Message } from '@/model/User';
import { ApiResponse } from '@/types/ApiResponse';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { Loader2, RefreshCcw } from 'lucide-react';
import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { AcceptMessageSchema } from '@/schemas/acceptMessageSchema';
import { messageSchema } from '@/schemas/messageSchema';

function UserDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [suggestions, setSuggestions] = useState<{ username: string; isAcceptingMessages: boolean }[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const suppressNextSuggestRef = useRef(false);

  const { toast } = useToast();

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter((message) => message._id !== messageId));
  };

  const { data: session } = useSession();

  const form = useForm({
    resolver: zodResolver(AcceptMessageSchema),
  });

  const { register, watch, setValue } = form;
  const acceptMessages = watch('acceptMessages');

  const sendForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
  });
  const messageContent = sendForm.watch('content');

  const extractUsername = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      return last || null;
    } catch {
      const cleaned = trimmed
        .replace(/^@/, '')
        .replace(/^u\//, '')
        .replace(/^\/?u\//, '');
      if (!cleaned) return null;
      return cleaned;
    }
  };

  const onSendSubmit = async (data: z.infer<typeof messageSchema>) => {
    const targetUsername = extractUsername(targetInput);
    if (!targetUsername) {
      toast({
        title: 'Invalid target',
        description: 'Enter a valid username or profile link',
        variant: 'destructive',
      });
      return;
    }
    setIsSending(true);
    try {
      const response = await axios.post<ApiResponse>('/api/send-message', {
        content: data.content,
        username: targetUsername,
      });
      toast({ title: response.data.message });
      sendForm.reset({ content: '' } as any);
      setSuggestions([]);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description:
          axiosError.response?.data.message ?? 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const fetchUserSuggestions = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSuggesting(true);
      try {
        const res = await axios.get('/api/search-users', { params: { q } });
        setSuggestions(res.data.users ?? []);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    },
    []
  );

  useEffect(() => {
    const id = setTimeout(() => {
      if (suppressNextSuggestRef.current) {
        suppressNextSuggestRef.current = false;
        setSuggestions([]);
        return;
      }
      fetchUserSuggestions(targetInput);
    }, 250);
    return () => clearTimeout(id);
  }, [targetInput, fetchUserSuggestions]);

  const fetchAcceptMessages = useCallback(async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.get<ApiResponse>('/api/accept-messages');
      setValue('acceptMessages', response.data.isAcceptingMessages);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description:
          axiosError.response?.data.message ??
          'Failed to fetch message settings',
        variant: 'destructive',
      });
    } finally {
      setIsSwitchLoading(false);
    }
  }, [setValue, toast]);

  const fetchMessages = useCallback(
    async (refresh: boolean = false) => {
      setIsLoading(true);
      setIsSwitchLoading(false);
      try {
        const response = await axios.get<ApiResponse>('/api/get-messages');
        setMessages(response.data.messages || []);
        if (refresh) {
          toast({
            title: 'Refreshed Messages',
            description: 'Showing latest messages',
          });
        }
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: 'Error',
          description:
            axiosError.response?.data.message ?? 'Failed to fetch messages',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setIsSwitchLoading(false);
      }
    },
    [setIsLoading, setMessages, toast]
  );

  // Fetch initial state from the server
  useEffect(() => {
    if (!session || !session.user) return;

    fetchMessages();

    fetchAcceptMessages();
  }, [session, setValue, toast, fetchAcceptMessages, fetchMessages]);

  // Handle switch change
  const handleSwitchChange = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/accept-messages', {
        acceptMessages: !acceptMessages,
      });
      setValue('acceptMessages', !acceptMessages);
      toast({
        title: response.data.message,
        variant: 'default',
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description:
          axiosError.response?.data.message ??
          'Failed to update message settings',
        variant: 'destructive',
      });
    }
  };

  if (!session || !session.user) {
    return <div></div>;
  }

  const { username } = session.user as User;

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const profileUrl = `${baseUrl}/u/${username}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: 'URL Copied!',
      description: 'Profile URL has been copied to clipboard.',
    });
  };

  const displayName = username || 'User';
  const possessiveTitle = displayName.endsWith('s')
    ? `${displayName}' Dashboard`
    : `${displayName}'s Dashboard`;

  return (
    <div className="my-8 mx-4 md:mx-8 lg:mx-auto p-6 bg-white rounded w-full max-w-6xl">
      <h1 className="text-4xl font-bold mb-4">{possessiveTitle}</h1>

      <div className="mb-6 border rounded p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">Send a message</h2>
        <Form {...sendForm}>
          <form onSubmit={sendForm.handleSubmit(onSendSubmit)} className="space-y-4">
            <div>
              <FormLabel>Target user</FormLabel>
              <Input
                placeholder="username or profile link (e.g. https://site/u/johndoe)"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
              />
              {targetInput && suggestions.length > 0 && (
                <div className="mt-2 border rounded divide-y">
                  {suggestions.map((s) => (
                    <button
                      key={s.username}
                      type="button"
                      className="w-full text-left p-2 hover:bg-gray-50"
                      onClick={() => {
                        setTargetInput(s.username);
                        setSuggestions([]);
                        suppressNextSuggestRef.current = true;
                      }}
                    >
                      @{s.username}
                      {!s.isAcceptingMessages && (
                        <span className="ml-2 text-xs text-gray-500">not accepting</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {isSuggesting && (
                <div className="text-sm text-gray-500 mt-1">Searching…</div>
              )}
            </div>
            <FormField
              control={sendForm.control}
              name={"content" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your anonymous message here"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSending || !messageContent || !targetInput}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Form>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Copy Your Unique Link</h2>{' '}
        <div className="flex items-center">
          <input
            type="text"
            value={profileUrl}
            disabled
            className="input input-bordered w-full p-2 mr-2"
          />
          <Button onClick={copyToClipboard}>Copy</Button>
        </div>
      </div>

      <div className="mb-4">
        <Switch
          {...register('acceptMessages')}
          checked={acceptMessages}
          onCheckedChange={handleSwitchChange}
          disabled={isSwitchLoading}
        />
        <span className="ml-2">
          Accept Messages: {acceptMessages ? 'On' : 'Off'}
        </span>
      </div>
      <Separator />

      <Button
        className="mt-4"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          fetchMessages(true);
        }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
      </Button>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <MessageCard
              key={message._id}
              message={message}
              onMessageDelete={handleDeleteMessage}
            />
          ))
        ) : (
          <p>No messages to display.</p>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
